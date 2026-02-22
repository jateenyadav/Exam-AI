import { ExamMode, SectionPattern } from "@/lib/syllabus";

interface Q {
  questionText: string;
  options?: string[];
  correctAnswer: string;
  solution: string;
  difficulty: "easy" | "medium" | "hard";
  chapterName: string;
  hasSubParts?: boolean;
  subParts?: { questionText: string; correctAnswer: string; marks: number }[];
}

const physicsMCQ: Q[] = [
  { questionText: "A body of mass 2 kg is moving with a velocity of 5 m/s. What is its kinetic energy?", options: ["A) 10 J","B) 25 J","C) 50 J","D) 5 J"], correctAnswer: "B", solution: "KE = (1/2)mv² = (1/2)(2)(5²) = 25 J", difficulty: "easy", chapterName: "Work Energy and Power" },
  { questionText: "The SI unit of force is:", options: ["A) Joule","B) Watt","C) Newton","D) Pascal"], correctAnswer: "C", solution: "Force is measured in Newton (N) = kg·m/s²", difficulty: "easy", chapterName: "Laws of Motion" },
  { questionText: "Which of the following is a vector quantity?", options: ["A) Speed","B) Mass","C) Temperature","D) Displacement"], correctAnswer: "D", solution: "Displacement has both magnitude and direction, making it a vector quantity.", difficulty: "easy", chapterName: "Motion in a Plane" },
  { questionText: "The acceleration due to gravity on the surface of Earth is approximately:", options: ["A) 8.9 m/s²","B) 9.8 m/s²","C) 10.8 m/s²","D) 11.2 m/s²"], correctAnswer: "B", solution: "g ≈ 9.8 m/s² on Earth's surface", difficulty: "easy", chapterName: "Gravitation" },
  { questionText: "A car accelerates uniformly from rest to 20 m/s in 10 seconds. The acceleration is:", options: ["A) 1 m/s²","B) 2 m/s²","C) 0.5 m/s²","D) 4 m/s²"], correctAnswer: "B", solution: "a = (v-u)/t = (20-0)/10 = 2 m/s²", difficulty: "easy", chapterName: "Motion in a Straight Line" },
  { questionText: "The dimensional formula of Planck's constant is:", options: ["A) [ML²T⁻¹]","B) [MLT⁻²]","C) [ML²T⁻²]","D) [ML²T⁻³]"], correctAnswer: "A", solution: "h = E/ν. [h] = [ML²T⁻²]/[T⁻¹] = [ML²T⁻¹]", difficulty: "medium", chapterName: "Units and Measurements" },
  { questionText: "Two forces of 3N and 4N act at right angles. The resultant force is:", options: ["A) 7 N","B) 1 N","C) 5 N","D) 12 N"], correctAnswer: "C", solution: "R = √(3²+4²) = √(9+16) = √25 = 5 N", difficulty: "medium", chapterName: "Motion in a Plane" },
  { questionText: "The moment of inertia of a solid sphere about its diameter is:", options: ["A) (2/5)MR²","B) (2/3)MR²","C) (1/2)MR²","D) MR²"], correctAnswer: "A", solution: "For solid sphere, I = (2/5)MR² about diameter", difficulty: "medium", chapterName: "System of Particles and Rotational Motion" },
  { questionText: "Young's modulus has the same dimensions as:", options: ["A) Force","B) Pressure","C) Energy","D) Momentum"], correctAnswer: "B", solution: "Young's modulus Y = Stress/Strain. Stress has dimensions of pressure [ML⁻¹T⁻²]", difficulty: "medium", chapterName: "Mechanical Properties of Solids" },
  { questionText: "In an isothermal process for an ideal gas:", options: ["A) Temperature changes","B) Internal energy changes","C) Work done = Heat absorbed","D) Pressure remains constant"], correctAnswer: "C", solution: "In isothermal process, ΔT=0, so ΔU=0, and by first law Q=W", difficulty: "medium", chapterName: "Thermodynamics" },
  { questionText: "The escape velocity from Earth is approximately:", options: ["A) 7.9 km/s","B) 9.8 km/s","C) 11.2 km/s","D) 15.0 km/s"], correctAnswer: "C", solution: "Escape velocity = √(2gR) ≈ 11.2 km/s for Earth", difficulty: "medium", chapterName: "Gravitation" },
  { questionText: "The speed of sound in air at NTP is approximately:", options: ["A) 232 m/s","B) 332 m/s","C) 432 m/s","D) 532 m/s"], correctAnswer: "B", solution: "Speed of sound in air at 0°C ≈ 332 m/s", difficulty: "easy", chapterName: "Waves" },
  { questionText: "A simple pendulum has time period T. If its length is doubled, the new time period is:", options: ["A) T","B) 2T","C) T√2","D) T/√2"], correctAnswer: "C", solution: "T = 2π√(L/g). If L→2L, T' = 2π√(2L/g) = T√2", difficulty: "medium", chapterName: "Oscillations" },
  { questionText: "The rms speed of gas molecules is proportional to:", options: ["A) T","B) √T","C) T²","D) 1/T"], correctAnswer: "B", solution: "v_rms = √(3kT/m), so v_rms ∝ √T", difficulty: "medium", chapterName: "Kinetic Theory" },
  { questionText: "The coefficient of restitution for a perfectly elastic collision is:", options: ["A) 0","B) 0.5","C) 1","D) Infinity"], correctAnswer: "C", solution: "For perfectly elastic collision, e = 1 (no kinetic energy loss)", difficulty: "easy", chapterName: "Work Energy and Power" },
  { questionText: "Bernoulli's principle is based on conservation of:", options: ["A) Mass","B) Energy","C) Momentum","D) Angular momentum"], correctAnswer: "B", solution: "Bernoulli's equation is derived from conservation of energy for fluid flow", difficulty: "medium", chapterName: "Mechanical Properties of Fluids" },
  { questionText: "The efficiency of a Carnot engine operating between 500K and 300K is:", options: ["A) 20%","B) 30%","C) 40%","D) 60%"], correctAnswer: "C", solution: "η = 1 - T₂/T₁ = 1 - 300/500 = 0.4 = 40%", difficulty: "hard", chapterName: "Thermodynamics" },
  { questionText: "If the radius of Earth shrinks by 2% keeping mass constant, g on surface changes by:", options: ["A) +2%","B) -2%","C) +4%","D) -4%"], correctAnswer: "C", solution: "g = GM/R². If R decreases by 2%, g increases by ~4% (Δg/g = -2ΔR/R)", difficulty: "hard", chapterName: "Gravitation" },
];

const chemistryMCQ: Q[] = [
  { questionText: "The number of moles in 36 g of water (H₂O) is:", options: ["A) 1","B) 2","C) 3","D) 4"], correctAnswer: "B", solution: "Molar mass of H₂O = 18 g/mol. Moles = 36/18 = 2", difficulty: "easy", chapterName: "Some Basic Concepts of Chemistry" },
  { questionText: "Which quantum number determines the shape of an orbital?", options: ["A) Principal (n)","B) Azimuthal (l)","C) Magnetic (ml)","D) Spin (ms)"], correctAnswer: "B", solution: "Azimuthal quantum number (l) determines the shape of orbital", difficulty: "easy", chapterName: "Structure of Atom" },
  { questionText: "Which of the following has the highest ionization energy?", options: ["A) Na","B) Mg","C) Al","D) Ne"], correctAnswer: "D", solution: "Noble gases have highest IE due to stable, completely filled configuration", difficulty: "medium", chapterName: "Classification of Elements and Periodicity in Properties" },
  { questionText: "The hybridization in methane (CH₄) is:", options: ["A) sp","B) sp²","C) sp³","D) sp³d"], correctAnswer: "C", solution: "Carbon in CH₄ has 4 bonding pairs, hybridization = sp³, tetrahedral geometry", difficulty: "easy", chapterName: "Chemical Bonding and Molecular Structure" },
  { questionText: "For an exothermic reaction at constant pressure:", options: ["A) ΔH > 0","B) ΔH < 0","C) ΔH = 0","D) ΔH = ΔU"], correctAnswer: "B", solution: "Exothermic reactions release heat, so ΔH is negative", difficulty: "easy", chapterName: "Thermodynamics" },
  { questionText: "The pH of 0.001 M HCl solution is:", options: ["A) 1","B) 2","C) 3","D) 4"], correctAnswer: "C", solution: "pH = -log[H⁺] = -log(10⁻³) = 3", difficulty: "easy", chapterName: "Equilibrium" },
  { questionText: "In the reaction 2Fe³⁺ + Sn²⁺ → 2Fe²⁺ + Sn⁴⁺, the reducing agent is:", options: ["A) Fe³⁺","B) Fe²⁺","C) Sn²⁺","D) Sn⁴⁺"], correctAnswer: "C", solution: "Sn²⁺ loses electrons (oxidized), so it is the reducing agent", difficulty: "medium", chapterName: "Redox Reactions" },
  { questionText: "IUPAC name of CH₃CH(OH)CH₃ is:", options: ["A) 1-propanol","B) 2-propanol","C) propan-1-ol","D) propan-2-ol"], correctAnswer: "D", solution: "The OH is on carbon 2, so IUPAC name is propan-2-ol", difficulty: "medium", chapterName: "Organic Chemistry – Some Basic Principles and Techniques" },
  { questionText: "Which is an unsaturated hydrocarbon?", options: ["A) Ethane","B) Ethene","C) Methane","D) Propane"], correctAnswer: "B", solution: "Ethene (C₂H₄) has a C=C double bond, making it unsaturated", difficulty: "easy", chapterName: "Hydrocarbons" },
  { questionText: "Acid rain is caused mainly by:", options: ["A) CO₂ and CO","B) SO₂ and NO₂","C) CH₄ and O₃","D) N₂ and O₂"], correctAnswer: "B", solution: "SO₂ and NO₂ dissolve in rainwater forming H₂SO₄ and HNO₃", difficulty: "easy", chapterName: "Environmental Chemistry" },
  { questionText: "The bond order of N₂ molecule is:", options: ["A) 1","B) 2","C) 3","D) 4"], correctAnswer: "C", solution: "N₂ has triple bond (one σ + two π), bond order = 3", difficulty: "medium", chapterName: "Chemical Bonding and Molecular Structure" },
  { questionText: "Le Chatelier's principle predicts the effect of changing:", options: ["A) Only temperature","B) Only pressure","C) Only concentration","D) Temperature, pressure, and concentration"], correctAnswer: "D", solution: "Le Chatelier's principle applies to all changes in equilibrium conditions", difficulty: "medium", chapterName: "Equilibrium" },
  { questionText: "The enthalpy of formation of an element in its standard state is:", options: ["A) 1 kJ/mol","B) 0 kJ/mol","C) -1 kJ/mol","D) Depends on element"], correctAnswer: "B", solution: "By convention, ΔHf° of elements in standard state = 0", difficulty: "easy", chapterName: "Thermodynamics" },
  { questionText: "Markovnikov's rule is applicable to:", options: ["A) Addition to symmetric alkenes","B) Addition to unsymmetric alkenes","C) Substitution reactions","D) Elimination reactions"], correctAnswer: "B", solution: "Markovnikov's rule applies to addition of HX to unsymmetric alkenes", difficulty: "medium", chapterName: "Hydrocarbons" },
  { questionText: "Which oxide is amphoteric?", options: ["A) Na₂O","B) MgO","C) Al₂O₃","D) SO₃"], correctAnswer: "C", solution: "Al₂O₃ reacts with both acids and bases, making it amphoteric", difficulty: "medium", chapterName: "Classification of Elements and Periodicity in Properties" },
  { questionText: "The oxidation state of Cr in K₂Cr₂O₇ is:", options: ["A) +3","B) +4","C) +6","D) +7"], correctAnswer: "C", solution: "2(+1) + 2(x) + 7(-2) = 0, so 2 + 2x - 14 = 0, x = +6", difficulty: "medium", chapterName: "Redox Reactions" },
];

const mathsMCQ: Q[] = [
  { questionText: "If A = {1,2,3} and B = {2,3,4}, then A ∩ B is:", options: ["A) {1,2,3,4}","B) {2,3}","C) {1,4}","D) {1}"], correctAnswer: "B", solution: "A ∩ B = elements common to both = {2,3}", difficulty: "easy", chapterName: "Sets" },
  { questionText: "The value of sin(30°) + cos(60°) is:", options: ["A) 0","B) 1/2","C) 1","D) √3/2"], correctAnswer: "C", solution: "sin(30°) = 1/2, cos(60°) = 1/2. Sum = 1/2 + 1/2 = 1", difficulty: "easy", chapterName: "Trigonometric Functions" },
  { questionText: "The modulus of the complex number 3 + 4i is:", options: ["A) 3","B) 4","C) 5","D) 7"], correctAnswer: "C", solution: "|3+4i| = √(3²+4²) = √(9+16) = √25 = 5", difficulty: "easy", chapterName: "Complex Numbers and Quadratic Equations" },
  { questionText: "The number of ways to arrange 5 books on a shelf is:", options: ["A) 5","B) 25","C) 60","D) 120"], correctAnswer: "D", solution: "5! = 5×4×3×2×1 = 120", difficulty: "easy", chapterName: "Permutations and Combinations" },
  { questionText: "The coefficient of x² in (1+x)⁵ is:", options: ["A) 5","B) 10","C) 15","D) 20"], correctAnswer: "B", solution: "C(5,2) = 5!/(2!3!) = 10", difficulty: "easy", chapterName: "Binomial Theorem" },
  { questionText: "Sum of first 10 natural numbers is:", options: ["A) 45","B) 50","C) 55","D) 60"], correctAnswer: "C", solution: "S = n(n+1)/2 = 10(11)/2 = 55", difficulty: "easy", chapterName: "Sequences and Series" },
  { questionText: "The slope of the line 2x - 3y + 6 = 0 is:", options: ["A) 2/3","B) -2/3","C) 3/2","D) -3/2"], correctAnswer: "A", solution: "3y = 2x + 6, y = (2/3)x + 2. Slope = 2/3", difficulty: "easy", chapterName: "Straight Lines" },
  { questionText: "The derivative of sin(x) is:", options: ["A) -sin(x)","B) cos(x)","C) -cos(x)","D) tan(x)"], correctAnswer: "B", solution: "d/dx[sin(x)] = cos(x)", difficulty: "easy", chapterName: "Limits and Derivatives" },
  { questionText: "The eccentricity of a circle is:", options: ["A) 0","B) 1","C) 1/2","D) √2"], correctAnswer: "A", solution: "A circle is a special ellipse with e = 0", difficulty: "easy", chapterName: "Conic Sections" },
  { questionText: "If P(A) = 0.3 and P(B) = 0.4, and A,B are independent, then P(A∩B) is:", options: ["A) 0.7","B) 0.12","C) 0.1","D) 0.3"], correctAnswer: "B", solution: "For independent events, P(A∩B) = P(A)×P(B) = 0.3×0.4 = 0.12", difficulty: "medium", chapterName: "Probability" },
  { questionText: "The distance of point (3,4) from the origin is:", options: ["A) 3","B) 4","C) 5","D) 7"], correctAnswer: "C", solution: "d = √(3²+4²) = √25 = 5", difficulty: "easy", chapterName: "Introduction to Three Dimensional Geometry" },
  { questionText: "lim(x→0) sin(x)/x equals:", options: ["A) 0","B) 1","C) ∞","D) Does not exist"], correctAnswer: "B", solution: "This is a standard limit: lim(x→0) sin(x)/x = 1", difficulty: "easy", chapterName: "Limits and Derivatives" },
  { questionText: "Mean of 2,4,6,8,10 is:", options: ["A) 4","B) 5","C) 6","D) 7"], correctAnswer: "C", solution: "Mean = (2+4+6+8+10)/5 = 30/5 = 6", difficulty: "easy", chapterName: "Statistics" },
  { questionText: "Solution set of |x| < 3 is:", options: ["A) (-3,3)","B) [-3,3]","C) (-∞,-3)∪(3,∞)","D) {-3,3}"], correctAnswer: "A", solution: "|x| < 3 means -3 < x < 3, i.e., open interval (-3,3)", difficulty: "easy", chapterName: "Linear Inequalities" },
  { questionText: "If f(x) = x² + 1 and g(x) = x - 1, then f(g(2)) is:", options: ["A) 1","B) 2","C) 4","D) 5"], correctAnswer: "B", solution: "g(2) = 2-1 = 1. f(1) = 1²+1 = 2", difficulty: "easy", chapterName: "Relations and Functions" },
  { questionText: "The general term of GP with first term a and common ratio r is:", options: ["A) a + (n-1)r","B) ar^n","C) ar^(n-1)","D) a/r^n"], correctAnswer: "C", solution: "nth term of GP = ar^(n-1)", difficulty: "easy", chapterName: "Sequences and Series" },
];

const physicsShort: Q[] = [
  { questionText: "State Newton's second law of motion. A force of 10 N acts on a body of mass 2 kg. Find the acceleration produced.", correctAnswer: "Newton's second law: F = ma. Acceleration a = F/m = 10/2 = 5 m/s²", solution: "Newton's second law states that the rate of change of momentum is directly proportional to the applied force. F = ma. Given F=10N, m=2kg, a = 10/2 = 5 m/s²", difficulty: "easy", chapterName: "Laws of Motion" },
  { questionText: "Define escape velocity. On what factors does it depend?", correctAnswer: "Escape velocity is the minimum velocity needed for an object to escape Earth's gravitational field. ve = √(2gR). It depends on mass and radius of the planet.", solution: "Escape velocity = √(2GM/R) = √(2gR). It depends on mass (M) and radius (R) of the planet, not on mass of the escaping body.", difficulty: "medium", chapterName: "Gravitation" },
  { questionText: "What is the difference between isothermal and adiabatic processes?", correctAnswer: "Isothermal: constant temperature (ΔT=0), PV=const. Adiabatic: no heat exchange (Q=0), PV^γ=const.", solution: "Isothermal: Temperature constant, system exchanges heat with surroundings, PV=nRT=const. Adiabatic: No heat exchange, Q=0, temperature changes, PV^γ=constant.", difficulty: "medium", chapterName: "Thermodynamics" },
  { questionText: "A spring of spring constant k = 200 N/m is compressed by 0.1 m. Find the potential energy stored.", correctAnswer: "PE = (1/2)kx² = (1/2)(200)(0.01) = 1 J", solution: "Elastic PE = (1/2)kx² = (1/2)(200)(0.1)² = (1/2)(200)(0.01) = 1 J", difficulty: "easy", chapterName: "Work Energy and Power" },
  { questionText: "Define stress and strain. State the SI units of Young's modulus.", correctAnswer: "Stress = Force/Area (Pa). Strain = Change in dimension/Original dimension (dimensionless). Young's modulus unit: Pa or N/m²", solution: "Stress = F/A (unit: Pa or N/m²). Strain = ΔL/L (dimensionless). Young's modulus Y = Stress/Strain, unit: Pa or N/m²", difficulty: "easy", chapterName: "Mechanical Properties of Solids" },
];

const physicsLong: Q[] = [
  { questionText: "Derive the equation for the time period of a simple pendulum. A pendulum of length 1 m oscillates on a planet where g = 4.9 m/s². Find the time period.", correctAnswer: "T = 2π√(L/g). For L=1m, g=4.9: T = 2π√(1/4.9) = 2π(0.4518) = 2.838 s ≈ 2.84 s", solution: "Derivation: For small angle θ, restoring force F = -mg sinθ ≈ -mgθ = -mg(x/L). So a = -gx/L. Comparing with SHM a=-ω²x: ω² = g/L, ω = √(g/L). T = 2π/ω = 2π√(L/g). Numerical: T = 2π√(1/4.9) = 2π × 0.4518 = 2.84 s", difficulty: "medium", chapterName: "Oscillations" },
  { questionText: "State and prove the law of conservation of linear momentum. Give one example.", correctAnswer: "In absence of external force, total momentum of a system remains constant. For two bodies: m₁u₁+m₂u₂ = m₁v₁+m₂v₂", solution: "Law: If no external force acts, total momentum is conserved. Proof: By Newton's third law, F₁₂ = -F₂₁. m₁(dv₁/dt) = -m₂(dv₂/dt). Integrating: m₁v₁ + m₂v₂ = m₁u₁ + m₂u₂ = constant. Example: Recoil of a gun.", difficulty: "medium", chapterName: "Laws of Motion" },
  { questionText: "Derive an expression for the orbital velocity of a satellite. A satellite orbits Earth at height h = R (radius of Earth). Find its orbital velocity in terms of g and R.", correctAnswer: "v₀ = √(gR²/(R+h)). At h=R: v₀ = √(gR²/2R) = √(gR/2)", solution: "For circular orbit: Gravitational force = Centripetal force. GMm/(R+h)² = mv²/(R+h). v² = GM/(R+h). Since g=GM/R², GM=gR². So v = √(gR²/(R+h)). At h=R: v = √(gR²/2R) = √(gR/2) = R√(g/2)", difficulty: "hard", chapterName: "Gravitation" },
];

const physicsCaseBased: Q[] = [
  { questionText: "Case Study: A ball is thrown vertically upward from the ground with initial velocity 20 m/s. Take g = 10 m/s². Air resistance is negligible.\n\nBased on this information, answer the following:", correctAnswer: "See sub-parts", solution: "Using equations of motion with u=20 m/s, g=10 m/s²", difficulty: "medium", chapterName: "Motion in a Straight Line", hasSubParts: true, subParts: [
    { questionText: "(a) What is the maximum height reached by the ball?", correctAnswer: "H = u²/2g = 400/20 = 20 m", marks: 1 },
    { questionText: "(b) What is the time taken to reach maximum height?", correctAnswer: "t = u/g = 20/10 = 2 seconds", marks: 1 },
    { questionText: "(c) What is the total time of flight?", correctAnswer: "T = 2u/g = 40/10 = 4 seconds", marks: 1 },
    { questionText: "(d) What is the velocity of the ball when it returns to the ground?", correctAnswer: "v = -u = -20 m/s (same magnitude, opposite direction)", marks: 1 },
  ]},
  { questionText: "Case Study: A block of mass 5 kg is placed on a rough inclined plane making an angle of 30° with the horizontal. The coefficient of friction μ = 0.3.\n\nAnswer the following:", correctAnswer: "See sub-parts", solution: "Analysis of forces on inclined plane with friction", difficulty: "medium", chapterName: "Laws of Motion", hasSubParts: true, subParts: [
    { questionText: "(a) What is the component of gravitational force along the incline?", correctAnswer: "mg sinθ = 5×10×sin30° = 25 N", marks: 1 },
    { questionText: "(b) What is the normal reaction?", correctAnswer: "N = mg cosθ = 5×10×cos30° = 43.3 N", marks: 1 },
    { questionText: "(c) What is the maximum frictional force?", correctAnswer: "f = μN = 0.3×43.3 = 13 N", marks: 1 },
    { questionText: "(d) Will the block slide? If yes, find the acceleration.", correctAnswer: "Net force = 25-13 = 12 N down the incline. a = 12/5 = 2.4 m/s². Yes, block slides.", marks: 1 },
  ]},
];

const chemShort: Q[] = [
  { questionText: "Calculate the molarity of a solution containing 4 g of NaOH dissolved in 500 mL of solution.", correctAnswer: "Moles of NaOH = 4/40 = 0.1 mol. Molarity = 0.1/0.5 = 0.2 M", solution: "Molar mass of NaOH = 23+16+1 = 40 g/mol. Moles = 4/40 = 0.1 mol. Volume = 500 mL = 0.5 L. Molarity = moles/volume(L) = 0.1/0.5 = 0.2 M", difficulty: "easy", chapterName: "Some Basic Concepts of Chemistry" },
  { questionText: "Write the electronic configuration of Fe (Z=26) and Fe²⁺.", correctAnswer: "Fe: [Ar] 3d⁶ 4s². Fe²⁺: [Ar] 3d⁶ (electrons removed from 4s first)", solution: "Fe (Z=26): 1s² 2s² 2p⁶ 3s² 3p⁶ 3d⁶ 4s² = [Ar] 3d⁶ 4s². Fe²⁺: Remove 2 electrons from 4s first → [Ar] 3d⁶", difficulty: "medium", chapterName: "Structure of Atom" },
  { questionText: "What is Le Chatelier's principle? How does increasing pressure affect the equilibrium N₂ + 3H₂ ⇌ 2NH₃?", correctAnswer: "Equilibrium shifts to oppose the change. Increasing pressure favors the side with fewer moles of gas (products, 2 moles vs 4 moles), so equilibrium shifts right.", solution: "Le Chatelier's principle: If a system at equilibrium is disturbed, it shifts to oppose the change. N₂ + 3H₂ ⇌ 2NH₃. Reactants: 4 moles gas, Products: 2 moles gas. Increasing pressure → shifts to fewer moles → shifts to right → more NH₃ formed.", difficulty: "medium", chapterName: "Equilibrium" },
];

const mathsShort: Q[] = [
  { questionText: "Find the domain and range of f(x) = √(4 - x²).", correctAnswer: "Domain: [-2, 2]. Range: [0, 2]", solution: "For f(x) to be real: 4-x² ≥ 0, so x² ≤ 4, -2 ≤ x ≤ 2. Domain = [-2,2]. f(x) is max when x=0: f(0)=2. f(x) is min when x=±2: f=0. Range = [0,2]", difficulty: "medium", chapterName: "Relations and Functions" },
  { questionText: "Prove that sin²θ + cos²θ = 1.", correctAnswer: "From the unit circle or Pythagoras theorem in a right triangle with hypotenuse 1.", solution: "In a right triangle with sides a, b and hypotenuse c: sinθ = a/c, cosθ = b/c. sin²θ + cos²θ = a²/c² + b²/c² = (a²+b²)/c² = c²/c² = 1 (by Pythagoras theorem).", difficulty: "easy", chapterName: "Trigonometric Functions" },
  { questionText: "Find the number of terms in the expansion of (x + y)¹⁰.", correctAnswer: "Number of terms = 10 + 1 = 11", solution: "In the expansion of (x+y)^n, number of terms = n+1 = 10+1 = 11", difficulty: "easy", chapterName: "Binomial Theorem" },
  { questionText: "Find the equation of line passing through (1,2) with slope 3.", correctAnswer: "y - 2 = 3(x - 1), i.e., y = 3x - 1 or 3x - y - 1 = 0", solution: "Using point-slope form: y - y₁ = m(x - x₁). y - 2 = 3(x - 1). y = 3x - 3 + 2 = 3x - 1", difficulty: "easy", chapterName: "Straight Lines" },
  { questionText: "Evaluate: lim(x→2) (x² - 4)/(x - 2)", correctAnswer: "lim(x→2) (x+2)(x-2)/(x-2) = lim(x→2) (x+2) = 4", solution: "Factor: (x²-4)/(x-2) = (x+2)(x-2)/(x-2) = x+2 for x≠2. As x→2: limit = 2+2 = 4", difficulty: "easy", chapterName: "Limits and Derivatives" },
];

const integerType: Q[] = [
  { questionText: "A particle moves from (0,0) to (3,4) in a straight line. The displacement in metres is:", correctAnswer: "5", solution: "Displacement = √(3²+4²) = √(9+16) = √25 = 5 m", difficulty: "easy", chapterName: "Motion in a Plane" },
  { questionText: "The number of electrons in O²⁻ ion (atomic number of O = 8) is:", correctAnswer: "10", solution: "O has 8 electrons. O²⁻ gains 2 electrons → 8+2 = 10 electrons", difficulty: "easy", chapterName: "Structure of Atom" },
  { questionText: "If 3x + 2 = 17, then x is:", correctAnswer: "5", solution: "3x = 17-2 = 15. x = 15/3 = 5", difficulty: "easy", chapterName: "Linear Inequalities" },
  { questionText: "The value of 5! / 3! is:", correctAnswer: "20", solution: "5!/3! = (5×4×3!)/3! = 5×4 = 20", difficulty: "easy", chapterName: "Permutations and Combinations" },
  { questionText: "A ball is dropped from 45 m height. Time to reach ground (g=10 m/s²) in seconds is:", correctAnswer: "3", solution: "h = (1/2)gt². 45 = (1/2)(10)t². t² = 9. t = 3 s", difficulty: "medium", chapterName: "Motion in a Straight Line" },
  { questionText: "The oxidation number of Mn in KMnO₄ is:", correctAnswer: "7", solution: "+1 + x + 4(-2) = 0. 1 + x - 8 = 0. x = +7", difficulty: "medium", chapterName: "Redox Reactions" },
  { questionText: "How many sigma bonds are present in ethylene (C₂H₄)?", correctAnswer: "5", solution: "C=C has 1σ + 1π. Each C-H has 1σ. Total σ bonds = 1 + 4 = 5", difficulty: "medium", chapterName: "Chemical Bonding and Molecular Structure" },
  { questionText: "The value of sin(90°) + cos(0°) + tan(45°) is:", correctAnswer: "3", solution: "sin90° = 1, cos0° = 1, tan45° = 1. Sum = 1+1+1 = 3", difficulty: "easy", chapterName: "Trigonometric Functions" },
  { questionText: "The number of faces of a cuboid is:", correctAnswer: "6", solution: "A cuboid has 6 rectangular faces", difficulty: "easy", chapterName: "Introduction to Three Dimensional Geometry" },
  { questionText: "If the velocity of a body doubles, its kinetic energy becomes how many times?", correctAnswer: "4", solution: "KE = (1/2)mv². If v→2v: KE' = (1/2)m(2v)² = 4×(1/2)mv² = 4 times", difficulty: "easy", chapterName: "Work Energy and Power" },
];

const banks: Record<string, Q[]> = {
  physics_mcq: physicsMCQ,
  chemistry_mcq: chemistryMCQ,
  mathematics_mcq: mathsMCQ,
  physics_short: physicsShort,
  physics_long: physicsLong,
  physics_case: physicsCaseBased,
  chemistry_short: chemShort,
  mathematics_short: mathsShort,
  integer: integerType,
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickSubject(mode: ExamMode, subject: string): string {
  if (subject === "full_mock") return "physics";
  return subject;
}

export function getLocalQuestions(
  mode: ExamMode,
  subject: string,
  chapters: string[],
  section: SectionPattern
): Q[] {
  const subj = pickSubject(mode, subject);
  const type = section.type;

  let pool: Q[] = [];

  if (type === "mcq" || type === "assertion_reason") {
    pool = banks[`${subj}_mcq`] || banks["physics_mcq"];
  } else if (type === "integer") {
    pool = banks["integer"];
  } else if (type === "case_based") {
    pool = banks[`${subj}_case`] || banks["physics_case"];
  } else if (type === "long_answer") {
    pool = banks[`${subj}_long`] || banks["physics_long"];
  } else if (type === "short_answer") {
    pool = banks[`${subj}_short`] || banks["physics_short"];
  } else if (type === "multiple_correct") {
    pool = (banks[`${subj}_mcq`] || banks["physics_mcq"]).map(q => ({
      ...q,
      questionText: q.questionText.replace("Which of the following", "Which of the following (one or more correct)"),
    }));
  } else {
    pool = banks[`${subj}_short`] || banks["physics_short"];
  }

  const shuffled = shuffle(pool);
  const result: Q[] = [];

  for (let i = 0; i < section.questionCount; i++) {
    const base = shuffled[i % shuffled.length];
    const chapterName = chapters[i % chapters.length];
    const difficulty: Q["difficulty"] = i < section.questionCount * 0.3 ? "easy" : i < section.questionCount * 0.8 ? "medium" : "hard";
    result.push({
      ...base,
      chapterName,
      difficulty,
      hasSubParts: section.hasSubParts ? (base.hasSubParts || false) : false,
      subParts: section.hasSubParts ? (base.subParts || [
        { questionText: "(a) Define the key term in this context.", correctAnswer: "Definition as per NCERT", marks: 1 },
        { questionText: "(b) State the relevant formula or law.", correctAnswer: "Formula/law as per syllabus", marks: 1 },
        { questionText: "(c) Solve the numerical part.", correctAnswer: "Numerical solution", marks: 1 },
        { questionText: "(d) State one real-world application.", correctAnswer: "Application example", marks: 1 },
      ]) : undefined,
    });
  }

  return result;
}
