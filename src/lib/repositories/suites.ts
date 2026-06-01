import { prisma, generateId } from '../db.js';
import { EvalSuite } from '../../types.js';

export async function getAllSuites() {
  return await prisma.evalSuite.findMany();
}

export async function getSuiteById(id: string) {
  return await prisma.evalSuite.findUnique({
    where: { id }
  });
}

export async function createSuite(data: Omit<EvalSuite, 'id' | 'createdAt' | 'updatedAt'>) {
  const id = generateId('suite');
  return await prisma.evalSuite.create({
    data: {
      ...data,
      id
    }
  });
}
