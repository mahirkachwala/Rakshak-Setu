import { db, usersTable, centersTable, childrenTable, appointmentsTable, slotsTable } from "@workspace/db";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "swasthya_salt").digest("hex");
}

async function seed() {
  console.log("Seeding database...");

  // Centers
  const centers = [
    { id: "center-1", name: "PHC Andheri", address: "Andheri East, Mumbai", type: "PHC" as const, timing: "8:00 AM - 4:00 PM", services: ["BCG", "OPV", "DPT", "MMR", "Hepatitis B"], phone: "022-12345678", district: "Mumbai", state: "Maharashtra" },
    { id: "center-2", name: "UPHC Bandra", address: "Bandra West, Mumbai", type: "UPHC" as const, timing: "9:00 AM - 5:00 PM", services: ["BCG", "OPV", "DPT", "Pentavalent", "IPV"], phone: "022-87654321", district: "Mumbai", state: "Maharashtra" },
    { id: "center-3", name: "CHC Borivali", address: "Borivali North, Mumbai", type: "CHC" as const, timing: "8:00 AM - 6:00 PM", services: ["BCG", "OPV", "DPT", "MMR", "Hepatitis B", "IPV", "Pentavalent"], phone: "022-11223344", district: "Mumbai", state: "Maharashtra" },
  ];

  for (const center of centers) {
    await db.insert(centersTable).values(center).onConflictDoNothing();
  }

  // Users
  const users = [
    { id: "user-1", name: "Dr. Priya Sharma", email: "doctor@swasthyasetu.in", passwordHash: hashPassword("doctor123"), role: "doctor" as const, centerId: "center-1" },
    { id: "user-2", name: "Admin Rajesh", email: "admin@swasthyasetu.in", passwordHash: hashPassword("admin123"), role: "admin" as const, centerId: null },
    { id: "user-3", name: "Staff Meena", email: "staff@swasthyasetu.in", passwordHash: hashPassword("staff123"), role: "staff" as const, centerId: "center-2" },
  ];

  for (const user of users) {
    await db.insert(usersTable).values(user).onConflictDoNothing();
  }

  // Children
  const children = [
    { id: "child-1", name: "Aarav Patel", dob: "2024-03-15", gender: "Male", parentName: "Ravi Patel", parentPhone: "9876543210", address: "Andheri East, Mumbai", centerId: "center-1" },
    { id: "child-2", name: "Diya Singh", dob: "2024-01-22", gender: "Female", parentName: "Sunita Singh", parentPhone: "9765432109", address: "Bandra West, Mumbai", centerId: "center-2" },
    { id: "child-3", name: "Karan Mehta", dob: "2023-11-10", gender: "Male", parentName: "Amit Mehta", parentPhone: "9654321098", address: "Borivali North, Mumbai", centerId: "center-3" },
    { id: "child-4", name: "Sia Joshi", dob: "2024-05-08", gender: "Female", parentName: "Pooja Joshi", parentPhone: "9543210987", address: "Andheri East, Mumbai", centerId: "center-1" },
    { id: "child-5", name: "Rohan Kumar", dob: "2023-08-20", gender: "Male", parentName: "Deepak Kumar", parentPhone: "9432109876", address: "Bandra West, Mumbai", centerId: "center-2" },
    { id: "child-6", name: "Ananya Rao", dob: "2024-07-14", gender: "Female", parentName: "Srinivas Rao", parentPhone: "9321098765", address: "Borivali North, Mumbai", centerId: "center-3" },
  ];

  for (const child of children) {
    await db.insert(childrenTable).values(child).onConflictDoNothing();
  }

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  // Appointments
  const appointments = [
    { id: "appt-1", childId: "child-1", childName: "Aarav Patel", parentName: "Ravi Patel", parentPhone: "9876543210", vaccine: "BCG", date: today, time: "10:00 AM", centerId: "center-1", centerName: "PHC Andheri", status: "pending" as const, secretCode: "SS-A1B2", referenceId: "REF-001", childDob: "2024-03-15", address: "Andheri East, Mumbai" },
    { id: "appt-2", childId: "child-2", childName: "Diya Singh", parentName: "Sunita Singh", parentPhone: "9765432109", vaccine: "OPV", date: today, time: "11:30 AM", centerId: "center-1", centerName: "PHC Andheri", status: "completed" as const, secretCode: "SS-C3D4", referenceId: "REF-002", childDob: "2024-01-22", address: "Bandra West, Mumbai" },
    { id: "appt-3", childId: "child-3", childName: "Karan Mehta", parentName: "Amit Mehta", parentPhone: "9654321098", vaccine: "DPT", date: today, time: "02:00 PM", centerId: "center-2", centerName: "UPHC Bandra", status: "missed" as const, secretCode: "SS-E5F6", referenceId: "REF-003", childDob: "2023-11-10", address: "Borivali North, Mumbai" },
    { id: "appt-4", childId: "child-4", childName: "Sia Joshi", parentName: "Pooja Joshi", parentPhone: "9543210987", vaccine: "Hepatitis B", date: tomorrow, time: "09:30 AM", centerId: "center-1", centerName: "PHC Andheri", status: "pending" as const, secretCode: "SS-G7H8", referenceId: "REF-004", childDob: "2024-05-08", address: "Andheri East, Mumbai" },
    { id: "appt-5", childId: "child-5", childName: "Rohan Kumar", parentName: "Deepak Kumar", parentPhone: "9432109876", vaccine: "MMR", date: yesterday, time: "10:00 AM", centerId: "center-2", centerName: "UPHC Bandra", status: "completed" as const, secretCode: "SS-I9J0", referenceId: "REF-005", childDob: "2023-08-20", address: "Bandra West, Mumbai" },
    { id: "appt-6", childId: "child-6", childName: "Ananya Rao", parentName: "Srinivas Rao", parentPhone: "9321098765", vaccine: "Pentavalent", date: today, time: "03:30 PM", centerId: "center-3", centerName: "CHC Borivali", status: "pending" as const, secretCode: "SS-K1L2", referenceId: "REF-006", childDob: "2024-07-14", address: "Borivali North, Mumbai" },
    { id: "appt-7", childId: "child-1", childName: "Aarav Patel", parentName: "Ravi Patel", parentPhone: "9876543210", vaccine: "OPV", date: tomorrow, time: "01:00 PM", centerId: "center-1", centerName: "PHC Andheri", status: "pending" as const, secretCode: "SS-M3N4", referenceId: "REF-007", childDob: "2024-03-15", address: "Andheri East, Mumbai" },
    { id: "appt-8", childId: "child-3", childName: "Karan Mehta", parentName: "Amit Mehta", parentPhone: "9654321098", vaccine: "IPV", date: yesterday, time: "11:00 AM", centerId: "center-3", centerName: "CHC Borivali", status: "missed" as const, secretCode: "SS-O5P6", referenceId: "REF-008", childDob: "2023-11-10", address: "Borivali North, Mumbai" },
  ];

  for (const appt of appointments) {
    await db.insert(appointmentsTable).values(appt).onConflictDoNothing();
  }

  // Slots
  const slots = [
    { id: "slot-1", centerId: "center-1", centerName: "PHC Andheri", date: today, startTime: "09:00", endTime: "11:00", capacity: 20, booked: 8 },
    { id: "slot-2", centerId: "center-1", centerName: "PHC Andheri", date: today, startTime: "11:00", endTime: "13:00", capacity: 20, booked: 15 },
    { id: "slot-3", centerId: "center-2", centerName: "UPHC Bandra", date: today, startTime: "09:00", endTime: "12:00", capacity: 25, booked: 10 },
    { id: "slot-4", centerId: "center-3", centerName: "CHC Borivali", date: today, startTime: "08:00", endTime: "11:00", capacity: 30, booked: 5 },
    { id: "slot-5", centerId: "center-1", centerName: "PHC Andheri", date: tomorrow, startTime: "09:00", endTime: "11:00", capacity: 20, booked: 2 },
    { id: "slot-6", centerId: "center-2", centerName: "UPHC Bandra", date: tomorrow, startTime: "10:00", endTime: "13:00", capacity: 25, booked: 3 },
  ];

  for (const slot of slots) {
    await db.insert(slotsTable).values(slot).onConflictDoNothing();
  }

  console.log("✅ Seeding complete!");
  console.log("Login credentials:");
  console.log("  Doctor: doctor@swasthyasetu.in / doctor123");
  console.log("  Admin:  admin@swasthyasetu.in / admin123");
  console.log("  Staff:  staff@swasthyasetu.in / staff123");
}

seed().catch(console.error).finally(() => process.exit(0));
