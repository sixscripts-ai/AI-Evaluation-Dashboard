import { prisma, generateId } from '../db.js';
import { EvalRun, EvalResult, Regression } from '../../types.js';

export async function getAllRuns() {
  return await prisma.evalRun.findMany({
    orderBy: { startedAt: 'desc' }
  });
}

export async function getCompletedRuns() {
  return await prisma.evalRun.findMany({
    where: { status: 'completed' },
    orderBy: { startedAt: 'desc' }
  });
}

export async function getCompletedRunsBySuiteId(suiteId: string) {
  return await prisma.evalRun.findMany({
    where: { suiteId, status: 'completed' },
    orderBy: { startedAt: 'desc' }
  });
}

export async function getRunById(id: string) {
  return await prisma.evalRun.findUnique({
    where: { id }
  });
}

export async function getRunsBySuiteId(suiteId: string) {
  return await prisma.evalRun.findMany({
    where: { suiteId },
    orderBy: { startedAt: 'desc' }
  });
}

export async function getResultsByRunId(runId: string) {
  return await prisma.evalResult.findMany({
    where: { runId }
  });
}

export async function getResultsByCaseId(caseId: string) {
  return await prisma.evalResult.findMany({
    where: { caseId },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getAllResults() {
  return await prisma.evalResult.findMany();
}

export async function getRegressionsByRunId(runId: string) {
  return await prisma.regression.findMany({
    where: { runId }
  });
}

export async function getAllRegressions() {
  return await prisma.regression.findMany();
}

export async function createRunData(
  run: EvalRun, 
  results: EvalResult[], 
  regressions: Regression[]
) {
  return await prisma.$transaction(async (tx) => {
    const newRun = await tx.evalRun.create({
      data: run
    });

    if (results.length > 0) {
      // Need to format assertions as Prisma JSON
      const formattedResults = results.map(r => ({
        ...r,
        assertions: r.assertions as any
      }));
      await tx.evalResult.createMany({
        data: formattedResults
      });
    }

    if (regressions.length > 0) {
      await tx.regression.createMany({
        data: regressions
      });
    }

    return newRun;
  });
}
