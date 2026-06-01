import { prisma } from '../db.js';

export async function getSourcesByCaseId(caseId: string) {
  return await prisma.evidenceSource.findMany({
    where: { caseId }
  });
}

export async function getAllSources() {
  return await prisma.evidenceSource.findMany();
}
