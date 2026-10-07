import prisma from "../src/app/lib/prisma";

const FEMALE_PORTRAITS = [
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1580894732444-8ecded7900cd?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1573496799652-408c2ac9fe98?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600",
];

const MALE_PORTRAITS = [
  "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=600",
];

async function updateLawyerPhotos() {
  console.log("Fetching all lawyers from database...");
  const lawyers = await prisma.lawyer.findMany();
  console.log(`Found ${lawyers.length} lawyers.`);

  let fIndex = 0;
  let mIndex = 0;

  for (const lawyer of lawyers) {
    const isFemale =
      lawyer.gender === "FEMALE" ||
      lawyer.name.toLowerCase().includes("sara") ||
      lawyer.name.toLowerCase().includes("sadia") ||
      lawyer.name.toLowerCase().includes("farhana") ||
      lawyer.name.toLowerCase().includes("tahmina") ||
      lawyer.name.toLowerCase().includes("nusrat") ||
      lawyer.name.toLowerCase().includes("fatema") ||
      lawyer.name.toLowerCase().includes("aisha");

    const photoUrl = isFemale
      ? FEMALE_PORTRAITS[fIndex++ % FEMALE_PORTRAITS.length]
      : MALE_PORTRAITS[mIndex++ % MALE_PORTRAITS.length];

    await prisma.lawyer.update({
      where: { id: lawyer.id },
      data: { profilePhoto: photoUrl },
    });

    console.log(`Updated ${lawyer.name} (${lawyer.gender}) -> ${photoUrl.slice(0, 50)}...`);
  }

  console.log("Successfully updated all lawyer photos in database!");
}

updateLawyerPhotos()
  .catch((e) => {
    console.error("Error updating lawyer photos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
