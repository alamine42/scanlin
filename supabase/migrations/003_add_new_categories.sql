-- Add new categories: tech_debt, performance, documentation

-- Drop the existing constraint
ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_category_check;

-- Add updated constraint with all categories
ALTER TABLE proposals ADD CONSTRAINT proposals_category_check
  CHECK (category IN ('security', 'testing', 'tech_debt', 'performance', 'documentation'));
