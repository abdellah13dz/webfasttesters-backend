-- CreateTable
CREATE TABLE "AppSubmission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "appName" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "playUrl" TEXT,
    "testingLink" TEXT NOT NULL,
    "pricingPlanId" TEXT,
    "planLabel" TEXT,
    "instructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSubmission_pkey" PRIMARY KEY ("id")
);
