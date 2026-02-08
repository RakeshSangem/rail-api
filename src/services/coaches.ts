import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { trainCoaches } from "../db/schema";

export async function getCoachesByTrainNo(trainNo: string) {
  return db
    .select({
      coachCode: trainCoaches.coachCode,
      coachClass: trainCoaches.coachClass,
      position: trainCoaches.position,
    })
    .from(trainCoaches)
    .where(eq(trainCoaches.trainNo, trainNo))
    .orderBy(trainCoaches.position);
}

export async function getCoachesByTrainNos(trainNos: string[]) {
  if (trainNos.length === 0) return [];
  
  return db
    .select({
      trainNo: trainCoaches.trainNo,
      coachCode: trainCoaches.coachCode,
      coachClass: trainCoaches.coachClass,
      position: trainCoaches.position,
    })
    .from(trainCoaches)
    .where(inArray(trainCoaches.trainNo, trainNos))
    .orderBy(trainCoaches.trainNo, trainCoaches.position);
}

export interface CoachInfo {
  coachCode: string;
  coachClass: string;
  position: number;
}

export function groupCoachesByTrain(
  coaches: { trainNo: string; coachCode: string; coachClass: string; position: number }[]
): Map<string, CoachInfo[]> {
  const grouped = new Map<string, CoachInfo[]>();
  
  for (const coach of coaches) {
    const existing = grouped.get(coach.trainNo) || [];
    existing.push({
      coachCode: coach.coachCode,
      coachClass: coach.coachClass,
      position: coach.position,
    });
    grouped.set(coach.trainNo, existing);
  }
  
  return grouped;
}
