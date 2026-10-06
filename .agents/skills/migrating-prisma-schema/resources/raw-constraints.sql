-- LegalEase Raw SQL Constraints & Partial Indexes
-- Place these in dedicated migrations to supplement Prisma schema definitions.

-- 1. Partial Unique Index for Active Consultation Slot Locking
-- Ensures no slot can have two non-canceled consultations simultaneously,
-- while allowing the slot to be booked again if a previous booking was canceled.
CREATE UNIQUE INDEX IF NOT EXISTS "consultation_active_slot_uq"
  ON "Consultation" ("lawyerId", "scheduleId")
  WHERE "status" <> 'CANCELED';

-- 2. Review Rating Check Constraint (1 to 5)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'review_rating_range'
  ) THEN
    ALTER TABLE "Review" ADD CONSTRAINT "review_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
  END IF;
END $$;

-- 3. Lawyer Fee Check Constraint (Must be positive integer taka)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lawyer_fee_positive'
  ) THEN
    ALTER TABLE "Lawyer" ADD CONSTRAINT "lawyer_fee_positive" CHECK ("consultationFee" > 0);
  END IF;
END $$;

-- 4. Payment Refund Amount Integrity Constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_refund_lte'
  ) THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "payment_refund_lte" CHECK ("refundedAmount" <= "amount");
  END IF;
END $$;
