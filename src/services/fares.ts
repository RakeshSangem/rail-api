import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { trainFares } from "../db/schema";

export async function getFaresByTrainNo(trainNo: string) {
  return db
    .select({
      classCode: trainFares.classCode,
      quotaCode: trainFares.quotaCode,
      fare: trainFares.fare,
      currency: trainFares.currency,
    })
    .from(trainFares)
    .where(eq(trainFares.trainNo, trainNo))
    .orderBy(trainFares.classCode, trainFares.quotaCode);
}

export async function getFaresByTrainNos(trainNos: string[]) {
  if (trainNos.length === 0) return [];
  
  return db
    .select({
      trainNo: trainFares.trainNo,
      classCode: trainFares.classCode,
      quotaCode: trainFares.quotaCode,
      fare: trainFares.fare,
      currency: trainFares.currency,
    })
    .from(trainFares)
    .where(inArray(trainFares.trainNo, trainNos))
    .orderBy(trainFares.trainNo, trainFares.classCode, trainFares.quotaCode);
}

export interface FareInfo {
  classCode: string;
  quotaCode: string;
  fare: number;
  currency: string;
}

export function groupFaresByTrain(
  fares: { trainNo: string; classCode: string; quotaCode: string; fare: number; currency: string }[]
): Map<string, FareInfo[]> {
  const grouped = new Map<string, FareInfo[]>();
  
  for (const fare of fares) {
    const existing = grouped.get(fare.trainNo) || [];
    existing.push({
      classCode: fare.classCode,
      quotaCode: fare.quotaCode,
      fare: fare.fare,
      currency: fare.currency,
    });
    grouped.set(fare.trainNo, existing);
  }
  
  return grouped;
}

export function getMinFareByTrain(
  fares: FareInfo[]
): { classCode: string; fare: number; currency: string } | null {
  if (fares.length === 0) return null;
  
  const minFare = fares.reduce((min, current) => 
    current.fare < min.fare ? current : min
  );
  
  return {
    classCode: minFare.classCode,
    fare: minFare.fare,
    currency: minFare.currency,
  };
}
