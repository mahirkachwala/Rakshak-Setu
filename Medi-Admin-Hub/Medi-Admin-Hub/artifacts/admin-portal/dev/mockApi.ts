import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import {
  cancelSharedBooking,
  checkInSharedBooking,
  completeSharedBooking,
  createAdminSlot,
  deleteAdminSlot,
  getAdminAppointment,
  getAdminPatientDetail,
  getDashboardStats,
  listAdminAppointments,
  listAdminCenters,
  listAdminPatients,
  listAdminSlots,
  listAdminVaccinations,
  loginPortalUser,
  rescheduleSharedBooking,
  resolvePortalUserFromAuthHeader,
  updateSharedBookingStatus,
  vaccinateSharedBooking,
} from "../../../../../shared/appointmentWorkflow";

function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => {
      if (chunk) chunks.push(Buffer.from(chunk));
    });
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: ServerResponse, data: unknown, statusCode = 200) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function getActorName(req: IncomingMessage) {
  const authHeader = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization;
  return resolvePortalUserFromAuthHeader(authHeader)?.name || "Portal Staff";
}

export function mockApiPlugin(): Plugin {
  return {
    name: "admin-portal-shared-json-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? new URL(req.url, "http://127.0.0.1") : null;
        const pathname = url?.pathname;
        if (!pathname?.startsWith("/api")) {
          next();
          return;
        }

        const method = (req.method || "GET").toUpperCase();

        if (method === "GET" && pathname === "/api/healthz") {
          sendJson(res, { status: "ok" });
          return;
        }

        if (method === "POST" && pathname === "/api/auth/login") {
          const body = (await parseBody(req)) as Partial<{ email: string; password: string }>;
          const login = body.email && body.password ? loginPortalUser(body.email, body.password) : null;
          if (!login) {
            sendJson(res, { error: "Invalid credentials provided." }, 401);
            return;
          }
          sendJson(res, login);
          return;
        }

        if (method === "GET" && pathname === "/api/dashboard/stats") {
          sendJson(res, getDashboardStats(url?.searchParams.get("centerId") || undefined));
          return;
        }

        if (method === "GET" && pathname === "/api/appointments") {
          sendJson(
            res,
            listAdminAppointments({
              date: url?.searchParams.get("date") || undefined,
              status: url?.searchParams.get("status") || undefined,
              vaccine: url?.searchParams.get("vaccine") || undefined,
              search: url?.searchParams.get("search") || undefined,
              centerId: url?.searchParams.get("centerId") || undefined,
            }),
          );
          return;
        }

        const appointmentMatch = pathname.match(/^\/api\/appointments\/([^/]+)$/);
        if (appointmentMatch && method === "GET") {
          const appointment = getAdminAppointment(decodeURIComponent(appointmentMatch[1]));
          if (!appointment) {
            sendJson(res, { error: "Appointment not found" }, 404);
            return;
          }
          sendJson(res, appointment);
          return;
        }

        const appointmentStatusMatch = pathname.match(/^\/api\/appointments\/([^/]+)\/status$/);
        if (appointmentStatusMatch && method === "PATCH") {
          const id = decodeURIComponent(appointmentStatusMatch[1]);
          const body = (await parseBody(req)) as Partial<{ status: string; notes: string }>;
          if (!body.status) {
            sendJson(res, { error: "Status is required" }, 400);
            return;
          }
          try {
            sendJson(
              res,
              updateSharedBookingStatus(id, {
                status: body.status as never,
                notes: body.notes,
                actorName: getActorName(req),
              }),
            );
          } catch (error) {
            sendJson(res, { error: error instanceof Error ? error.message : "Unable to update appointment" }, 400);
          }
          return;
        }

        const appointmentActionMatch = pathname.match(/^\/api\/appointments\/([^/]+)\/(checkin|vaccinate|complete|cancel|reschedule)$/);
        if (appointmentActionMatch && method === "POST") {
          const id = decodeURIComponent(appointmentActionMatch[1]);
          const action = appointmentActionMatch[2];
          const body = (await parseBody(req)) as Record<string, unknown>;

          try {
            if (action === "checkin") {
              sendJson(res, checkInSharedBooking(id, getActorName(req)));
              return;
            }
            if (action === "vaccinate") {
              sendJson(
                res,
                vaccinateSharedBooking(id, {
                  batchNumber: typeof body.batchNumber === "string" ? body.batchNumber : undefined,
                  notes: typeof body.notes === "string" ? body.notes : undefined,
                  actorName: getActorName(req),
                }),
              );
              return;
            }
            if (action === "complete") {
              sendJson(
                res,
                completeSharedBooking(id, {
                  notes: typeof body.notes === "string" ? body.notes : undefined,
                  actorName: getActorName(req),
                }),
              );
              return;
            }
            if (action === "cancel") {
              sendJson(
                res,
                cancelSharedBooking(id, {
                  reason: typeof body.reason === "string" ? body.reason : undefined,
                  remarks: typeof body.remarks === "string" ? body.remarks : undefined,
                  actorName: getActorName(req),
                }),
              );
              return;
            }
            if (action === "reschedule") {
              const result = rescheduleSharedBooking(id, {
                newDate: typeof body.newDate === "string" ? body.newDate : "",
                newTime: typeof body.newTime === "string" ? body.newTime : "",
                remarks: typeof body.remarks === "string" ? body.remarks : undefined,
                actorName: getActorName(req),
              });
              sendJson(res, {
                id: result.replacement.id,
                ...getAdminAppointment(result.replacement.id),
              });
              return;
            }
          } catch (error) {
            sendJson(res, { error: error instanceof Error ? error.message : "Unable to update appointment" }, 400);
            return;
          }
        }

        if (method === "GET" && pathname === "/api/patients") {
          sendJson(res, listAdminPatients(url?.searchParams.get("search") || undefined));
          return;
        }

        const patientMatch = pathname.match(/^\/api\/patients\/([^/]+)$/);
        if (patientMatch && method === "GET") {
          const detail = getAdminPatientDetail(decodeURIComponent(patientMatch[1]));
          if (!detail) {
            sendJson(res, { error: "Patient not found" }, 404);
            return;
          }
          sendJson(res, detail);
          return;
        }

        if (method === "GET" && pathname === "/api/vaccinations") {
          sendJson(
            res,
            listAdminVaccinations({
              childId: url?.searchParams.get("childId") || undefined,
              centerId: url?.searchParams.get("centerId") || undefined,
            }),
          );
          return;
        }

        if (method === "GET" && pathname === "/api/centers") {
          sendJson(res, listAdminCenters());
          return;
        }

        if (method === "GET" && pathname === "/api/slots") {
          sendJson(
            res,
            listAdminSlots({
              centerId: url?.searchParams.get("centerId") || undefined,
              date: url?.searchParams.get("date") || undefined,
            }),
          );
          return;
        }

        if (method === "POST" && pathname === "/api/slots") {
          const body = (await parseBody(req)) as Partial<{
            centerId: string;
            date: string;
            startTime: string;
            endTime: string;
            capacity: number;
          }>;
          if (!body.centerId || !body.date || !body.startTime || !body.endTime || !body.capacity) {
            sendJson(res, { error: "centerId, date, startTime, endTime, and capacity are required" }, 400);
            return;
          }
          sendJson(
            res,
            createAdminSlot({
              centerId: body.centerId,
              date: body.date,
              startTime: body.startTime,
              endTime: body.endTime,
              capacity: Number(body.capacity),
            }),
            201,
          );
          return;
        }

        const slotMatch = pathname.match(/^\/api\/slots\/([^/]+)$/);
        if (slotMatch && method === "DELETE") {
          sendJson(res, deleteAdminSlot(decodeURIComponent(slotMatch[1])));
          return;
        }

        sendJson(res, { error: "Mock API route not found" }, 404);
      });
    },
  };
}

