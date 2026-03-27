import { db, vaccinesTable, centersTable } from "@workspace/db";

const vaccines = [
  { name: "BCG", ageWeeks: 0, ageLabel: "At Birth", isMandatory: true, description: "Bacillus Calmette-Guérin vaccine protects against tuberculosis (TB), a serious lung infection.", sideEffects: "Small lump or sore at injection site (normal, heals over months)", diseases: "Tuberculosis (TB)" },
  { name: "Hepatitis B (1st dose)", ageWeeks: 0, ageLabel: "At Birth", isMandatory: true, description: "Protects against Hepatitis B virus infection that can lead to serious liver disease.", sideEffects: "Mild soreness at injection site, low-grade fever", diseases: "Hepatitis B, Liver disease" },
  { name: "OPV 0 (Oral Polio Vaccine)", ageWeeks: 0, ageLabel: "At Birth", isMandatory: true, description: "Oral polio drops protect against poliomyelitis. Given as sweet-tasting drops.", sideEffects: "None significant", diseases: "Poliomyelitis (Polio)" },
  { name: "DPT (1st dose)", ageWeeks: 6, ageLabel: "6 Weeks", isMandatory: true, description: "Combined vaccine protecting against Diphtheria, Pertussis (whooping cough), and Tetanus.", sideEffects: "Soreness, redness at injection site; mild fever for 1-2 days", diseases: "Diphtheria, Whooping Cough, Tetanus" },
  { name: "Hepatitis B (2nd dose)", ageWeeks: 6, ageLabel: "6 Weeks", isMandatory: true, description: "Second dose of Hepatitis B vaccine to build stronger immunity.", sideEffects: "Mild soreness, occasional low fever", diseases: "Hepatitis B" },
  { name: "IPV (Inactivated Polio Vaccine, 1st)", ageWeeks: 6, ageLabel: "6 Weeks", isMandatory: true, description: "Injected polio vaccine providing stronger, longer-lasting protection against polio.", sideEffects: "Mild soreness at injection site", diseases: "Poliomyelitis (Polio)" },
  { name: "Hib (1st dose)", ageWeeks: 6, ageLabel: "6 Weeks", isMandatory: true, description: "Haemophilus influenzae type b vaccine protects against meningitis and pneumonia.", sideEffects: "Mild redness, swelling at site", diseases: "Meningitis, Pneumonia, Epiglottitis" },
  { name: "PCV (1st dose)", ageWeeks: 6, ageLabel: "6 Weeks", isMandatory: false, description: "Pneumococcal Conjugate Vaccine protects against pneumococcal bacteria causing ear infections and pneumonia.", sideEffects: "Mild fever, soreness at injection site", diseases: "Pneumonia, Meningitis, Ear infections" },
  { name: "Rotavirus (1st dose)", ageWeeks: 6, ageLabel: "6 Weeks", isMandatory: true, description: "Oral vaccine protecting against rotavirus, the leading cause of severe diarrhea in children.", sideEffects: "Mild irritability, temporary diarrhea", diseases: "Rotavirus Diarrhea" },
  { name: "DPT (2nd dose)", ageWeeks: 10, ageLabel: "10 Weeks", isMandatory: true, description: "Second dose of DPT combined vaccine.", sideEffects: "Soreness, redness at injection site; mild fever", diseases: "Diphtheria, Whooping Cough, Tetanus" },
  { name: "IPV (2nd dose)", ageWeeks: 10, ageLabel: "10 Weeks", isMandatory: true, description: "Second dose of inactivated polio vaccine.", sideEffects: "Mild soreness", diseases: "Polio" },
  { name: "Hib (2nd dose)", ageWeeks: 10, ageLabel: "10 Weeks", isMandatory: true, description: "Second dose of Hib vaccine.", sideEffects: "Mild redness at site", diseases: "Meningitis, Pneumonia" },
  { name: "Hepatitis B (3rd dose)", ageWeeks: 10, ageLabel: "10 Weeks", isMandatory: true, description: "Third dose completes the Hepatitis B primary series.", sideEffects: "Minimal side effects", diseases: "Hepatitis B" },
  { name: "Rotavirus (2nd dose)", ageWeeks: 10, ageLabel: "10 Weeks", isMandatory: true, description: "Second dose of oral rotavirus vaccine.", sideEffects: "Mild irritability", diseases: "Rotavirus Diarrhea" },
  { name: "DPT (3rd dose)", ageWeeks: 14, ageLabel: "14 Weeks", isMandatory: true, description: "Third and final dose of the primary DPT series.", sideEffects: "Soreness, mild fever for 1-2 days", diseases: "Diphtheria, Whooping Cough, Tetanus" },
  { name: "IPV (3rd dose)", ageWeeks: 14, ageLabel: "14 Weeks", isMandatory: true, description: "Third dose of inactivated polio vaccine.", sideEffects: "Mild soreness", diseases: "Polio" },
  { name: "Hib (3rd dose)", ageWeeks: 14, ageLabel: "14 Weeks", isMandatory: true, description: "Third dose of Hib vaccine completing the primary series.", sideEffects: "Mild redness", diseases: "Meningitis, Pneumonia" },
  { name: "PCV (2nd dose)", ageWeeks: 14, ageLabel: "14 Weeks", isMandatory: false, description: "Second dose of pneumococcal conjugate vaccine.", sideEffects: "Mild fever, soreness", diseases: "Pneumonia, Meningitis" },
  { name: "Rotavirus (3rd dose)", ageWeeks: 14, ageLabel: "14 Weeks", isMandatory: true, description: "Third and final dose of oral rotavirus vaccine.", sideEffects: "Minimal side effects", diseases: "Rotavirus Diarrhea" },
  { name: "Measles / MR (1st dose)", ageWeeks: 36, ageLabel: "9 Months", isMandatory: true, description: "Measles-Rubella vaccine protects against measles and rubella (German measles).", sideEffects: "Mild fever, rash after 7-12 days (normal)", diseases: "Measles, Rubella" },
  { name: "JE (1st dose)", ageWeeks: 36, ageLabel: "9 Months", isMandatory: false, description: "Japanese Encephalitis vaccine (in endemic areas). Protects against brain infection.", sideEffects: "Mild soreness, low fever", diseases: "Japanese Encephalitis" },
  { name: "Vitamin A (1st dose)", ageWeeks: 36, ageLabel: "9 Months", isMandatory: true, description: "Vitamin A supplementation prevents blindness and strengthens immunity.", sideEffects: "Mild nausea (rare)", diseases: "Vitamin A deficiency, Night blindness" },
  { name: "DPT Booster (1st)", ageWeeks: 72, ageLabel: "18 Months", isMandatory: true, description: "First booster dose of DPT to maintain immunity.", sideEffects: "Soreness at injection site, mild fever", diseases: "Diphtheria, Whooping Cough, Tetanus" },
  { name: "MMR (2nd dose)", ageWeeks: 72, ageLabel: "18 Months", isMandatory: true, description: "Measles-Mumps-Rubella combined vaccine second dose.", sideEffects: "Mild fever, rash (7-12 days later)", diseases: "Measles, Mumps, Rubella" },
  { name: "OPV Booster", ageWeeks: 72, ageLabel: "18 Months", isMandatory: true, description: "Booster dose of oral polio vaccine.", sideEffects: "None significant", diseases: "Polio" },
  { name: "Hep A (1st dose)", ageWeeks: 72, ageLabel: "18 Months", isMandatory: false, description: "Hepatitis A vaccine protects against liver infection spread through contaminated food/water.", sideEffects: "Mild soreness, low-grade fever", diseases: "Hepatitis A" },
  { name: "Varicella (1st dose)", ageWeeks: 52, ageLabel: "12 Months", isMandatory: false, description: "Chickenpox vaccine prevents varicella-zoster virus infection.", sideEffects: "Mild fever, small rash at injection site", diseases: "Chickenpox (Varicella)" },
  { name: "DPT Booster (2nd)", ageWeeks: 260, ageLabel: "5 Years", isMandatory: true, description: "Second booster of DPT for school-entry protection.", sideEffects: "Soreness, mild fever", diseases: "Diphtheria, Whooping Cough, Tetanus" },
  { name: "OPV (5 Year Booster)", ageWeeks: 260, ageLabel: "5 Years", isMandatory: true, description: "Final booster of oral polio vaccine at school entry.", sideEffects: "None significant", diseases: "Polio" },
];

const centers = [
  { name: "Primary Health Centre, Koramangala", address: "80 Feet Road, Koramangala, Bengaluru - 560034", type: "phc", isFree: true, cost: "Free", phone: "080-25537890", vaccinesAvailable: "BCG, OPV, DPT, Hepatitis B, Measles, MMR", lat: 12.9279, lng: 77.6271, openHours: "9 AM - 5 PM", pincode: "560034", distance: "1.2 km" },
  { name: "Government District Hospital", address: "Fort Road, Shivajinagar, Bengaluru - 560001", type: "government", isFree: true, cost: "Free", phone: "080-22864444", vaccinesAvailable: "BCG, OPV, IPV, DPT, Hepatitis B, PCV, Rotavirus, Measles, MMR, JE, Vitamin A", lat: 12.9761, lng: 77.5994, openHours: "8 AM - 8 PM", pincode: "560001", distance: "3.5 km" },
  { name: "Apollo Clinic - HSR Layout", address: "Sector 2, HSR Layout, Bengaluru - 560102", type: "private", isFree: false, cost: "₹500-2000 per vaccine", phone: "1800-419-1919", vaccinesAvailable: "All vaccines including PCV, Rotavirus, Varicella, Hep A, Typhoid", lat: 12.9082, lng: 77.6476, openHours: "8 AM - 10 PM", pincode: "560102", distance: "2.8 km" },
  { name: "Urban Health Centre, Indiranagar", address: "100 Feet Road, Indiranagar, Bengaluru - 560038", type: "government", isFree: true, cost: "Free", phone: "080-25278901", vaccinesAvailable: "BCG, OPV, DPT, Hepatitis B, Measles, Vitamin A", lat: 12.9716, lng: 77.6412, openHours: "9 AM - 4 PM", pincode: "560038", distance: "4.1 km" },
  { name: "Manipal Hospital Vaccination Centre", address: "Old Airport Road, Bengaluru - 560017", type: "private", isFree: false, cost: "₹800-3000 per vaccine", phone: "080-25024444", vaccinesAvailable: "All vaccines, advanced immunizations, travel vaccines", lat: 12.9591, lng: 77.6489, openHours: "8 AM - 8 PM", pincode: "560017", distance: "5.2 km" },
  { name: "PHC Jayanagar", address: "4th Block, Jayanagar, Bengaluru - 560041", type: "phc", isFree: true, cost: "Free", phone: "080-26564432", vaccinesAvailable: "BCG, OPV, DPT, Hepatitis B, Measles, MMR, Rotavirus", lat: 12.9308, lng: 77.5834, openHours: "9 AM - 5 PM", pincode: "560041", distance: "2.3 km" },
];

async function seed() {
  console.log("Seeding vaccines...");
  const existingVaccines = await db.select().from(vaccinesTable);
  if (existingVaccines.length === 0) {
    await db.insert(vaccinesTable).values(vaccines);
    console.log(`Inserted ${vaccines.length} vaccines`);
  } else {
    console.log(`Vaccines already seeded (${existingVaccines.length} existing)`);
  }

  console.log("Seeding health centers...");
  const existingCenters = await db.select().from(centersTable);
  if (existingCenters.length === 0) {
    await db.insert(centersTable).values(centers);
    console.log(`Inserted ${centers.length} centers`);
  } else {
    console.log(`Centers already seeded (${existingCenters.length} existing)`);
  }

  console.log("Done!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
