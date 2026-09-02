# GPA Logic Audit — Supporting Document

## Current grading engine (`backend/src/utils/grading.ts`)

### Grade mapping
```
Score ≥ 70 → A (5 points)
Score ≥ 60 → B (4 points)
Score ≥ 50 → C (3 points)
Score ≥ 45 → D (2 points)
Score ≥ 40 → E (1 point)
Score < passMark → F (0 points)
```

### GPA formula
```
GPA = Σ(gradePoint × courseUnit) / Σ(courseUnit)
Rounded to 2 decimal places via Math.round(x * 100) / 100
```

### CGPA formula
```
CGPA = Σ(totalQualityPoints across all semesters) / Σ(totalUnits across all semesters)
```

### Class of degree
```
CGPA ≥ 4.50 → First Class Honours
CGPA ≥ 3.50 → Second Class Upper Division
CGPA ≥ 2.40 → Second Class Lower Division
CGPA ≥ 1.50 → Third Class
CGPA ≥ 1.00 → Pass
else → Fail
```

## Correctness (CONFIRMED)
- All boundary values verified: 0, 39, 40, 44, 45, 49, 50, 59, 60, 69, 70, 100
- `gradePoint` is integer (no floating issues)
- `pxu = gradePoint * unit` is Float (correct)
- GPA/CGPA rounding: 2dp via `Math.round(x*100)/100`
- Empty results → 0 GPA (not NaN)
- `getClassOfDegree` boundaries: 4.50, 3.50, 2.40, 1.50, 1.00

## Edge cases NOT handled
1. **Score = 0** → F (0 points) — correct
2. **Score = 100** → A (5 points) — correct
3. **Score = 100.5** → allowed (Float score) — may be unexpected
4. **Negative score** → throws `Error('Score must be between 0 and 100')` — correct
5. **Score > 100** → throws — correct
6. **All F grades** → GPA = 0.00 — correct
7. **Different pass marks per department** → supported via `Department.passMark` — good
8. **Zero results in semester** → GPA 0, CGPA continues — correct
9. **Repeated courses** → **NOT handled** — both attempts count; no "best grade" or "last sit" rule
10. **Carryover courses** → `isCarryOver` flag exists but is NOT used in GPA calculation (units counted again)
11. **Missing course in semester** → not counted (no "ABSENT" handling)
12. **Score 39 with passMark 40** → F — correct
13. **Score 40 with passMark 40** → E (since score >= 40, not < passMark) — edge: score == passMark yields E
14. **Score 39 with passMark 50** → F (since score < passMark) — CORRECT per logic, but note: 39 < 50 → F, even though 39 is a valid E-range score if passMark were 40
15. **Floating-point cumulation over many semesters** → `Math.round(totalPoints/totalUnits*100)/100` — correct

## Recommended new entity: GradingScale

```prisma
model GradingScale {
  id             String   @id @default(cuid())
  name           String   // e.g. "Nigerian 5.0 Scale", "4.0 Scale"
  maxGradePoint  Float    // 5.0
  decimalPlaces  Int      @default(2)
  roundingMode   RoundingMode @default(ROUND_HALF_UP)
  institutionId  String?
  departmentId   String?
  isDefault      Boolean  @default(false)
  bands          GradingBand[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@map("grading_scales")
}

enum RoundingMode {
  ROUND_HALF_UP
  TRUNCATE
  ROUND_HALF_DOWN
  THREE_DECIMAL
}

model GradingBand {
  id          String @id @default(cuid())
  scaleId     String
  scale       GradingScale @relation(fields: [scaleId], references: [id], onDelete: Cascade)
  minScore    Float  // inclusive
  maxScore    Float  // exclusive
  grade       String // "A", "B", "C", "D", "E", "F"
  gradePoint  Float
  isPass      Boolean @default(true)
  @@unique([scaleId, grade])
  @@map("grading_bands")
}

model GradingPolicy {
  id                        String @id @default(cuid())
  scaleId                   String
  scale                     GradingScale @relation(fields: [scaleId], references: [id])
  carryoverRule             CarryoverRule @default(LAST_SIT)
  repeatCourseRule          RepeatCourseRule @default(BEST_GRADE)
  includeZeroUnitCourses    Boolean @default(false)
  missingResultHandling     MissingResultHandling @default(EXCLUDE)
  @@map("grading_policies")
}

enum CarryoverRule { LAST_SIT BEST_TWO WEIGHTED_AVERAGE }
enum RepeatCourseRule { LAST_SIT BEST_GRADE BOTH_COUNT }
enum MissingResultHandling { EXCLUDE MARK_AS_ZERO }
```

The `calculateGPA` / `calculateCGPA` / `getClassOfDegree` functions should be pure functions that take a `GradingPolicy` and `GradingScale` (or their bands) as parameters, not reading from hardcoded constants. This makes them unit-testable across any scale.

## Test matrix for grading.ts

A comprehensive test suite must cover (at minimum):

```
determineGrade:
  - every score boundary: 0, 39, 40, 44, 45, 49, 50, 59, 60, 69, 70, 100
  - out of range: -1 → throw, 101 → throw
  - custom passMark: 50 → 49→F, 50→E
  - custom passMark: 30 → 29→F, 30→E

calculateGPA:
  - single course: 5 units, A → GPA=5.0
  - two courses: 2u A (10), 3u C (9) → GPA=19/5=3.80
  - all F → GPA=0.0
  - empty → GPA=0
  - rounding: 50/3=16.666 → 16.67 (divisible by 3 test)

calculateCGPA:
  - two semesters → sumPoints/sumUnits
  - empty → 0
  - single semester → same as GPA

getClassOfDegree:
  - every boundary: 4.50, 3.50, 2.40, 1.50, 1.00, 0.99
  - edge: 4.499 → 2:1 (not 1st)
  - edge: 3.500 → 2:1 (not 2:2)
```