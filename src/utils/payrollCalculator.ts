/**
 * Utility for calculating payroll deductions based on tenant settings.
 */
export interface PayrollCalculationInput {
  monthlySalary: number;
  excusedAbsences: number; // Number of days absent with permission
  unexcusedAbsences: number; // Number of days absent without permission
  excusedDeductionMultiplier: number; // Penalty multiplier from tenant settings (e.g. 1.0)
  unexcusedDeductionMultiplier: number; // Penalty multiplier from tenant settings (e.g. 2.0)
}

export interface PayrollCalculationResult {
  dailyRate: number;
  excusedDeductionAmount: number;
  unexcusedDeductionAmount: number;
  totalDeductions: number;
  finalNetSalary: number;
}

/**
 * Calculates the exact deductions and net salary based on absences.
 * The daily rate is calculated as: Monthly Salary / 30.
 */
export const calculatePayrollDeductions = (
  input: PayrollCalculationInput
): PayrollCalculationResult => {
  const dailyRate = input.monthlySalary / 30;

  // Excused absence deduction
  const excusedDeductionAmount = Number(
    (input.excusedAbsences * dailyRate * input.excusedDeductionMultiplier).toFixed(2)
  );

  // Unexcused absence deduction
  const unexcusedDeductionAmount = Number(
    (input.unexcusedAbsences * dailyRate * input.unexcusedDeductionMultiplier).toFixed(2)
  );

  const totalDeductions = Number((excusedDeductionAmount + unexcusedDeductionAmount).toFixed(2));
  const finalNetSalary = Number(Math.max(0, input.monthlySalary - totalDeductions).toFixed(2));

  return {
    dailyRate,
    excusedDeductionAmount,
    unexcusedDeductionAmount,
    totalDeductions,
    finalNetSalary,
  };
};
