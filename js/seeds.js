export function seedConstellation() {
  return {
    mapTitle: "Founder operating system",
    mapNote: "A sample constellation showing how long-term bets, experiments, and execution work connect.",
    stars: [
      {
        id: "star_mission_core",
        title: "Define the flagship product thesis",
        note: "Clarify the core promise that every project should reinforce.",
        kind: "mission",
        status: "cluster",
        impact: 10,
        confidence: 8,
        effort: 6,
        x: 46,
        y: 28,
      },
      {
        id: "star_bet_growth",
        title: "Ship a public growth engine",
        note: "Build a repeatable distribution asset that compounds trust.",
        kind: "bet",
        status: "orbit",
        impact: 9,
        confidence: 7,
        effort: 7,
        x: 70,
        y: 44,
      },
      {
        id: "star_experiment_interviews",
        title: "Run 12 customer interviews",
        note: "Pressure-test assumptions before heavier investment.",
        kind: "experiment",
        status: "spark",
        impact: 7,
        confidence: 8,
        effort: 4,
        x: 26,
        y: 52,
      },
      {
        id: "star_ops_pipeline",
        title: "Automate the execution pipeline",
        note: "Reduce friction between ideas, delivery, and follow-up.",
        kind: "ops",
        status: "launch",
        impact: 8,
        confidence: 9,
        effort: 5,
        x: 58,
        y: 70,
      }
    ],
    links: [
      { id: "link_1", from: "star_experiment_interviews", to: "star_mission_core", label: "sharpens" },
      { id: "link_2", from: "star_mission_core", to: "star_bet_growth", label: "guides" },
      { id: "link_3", from: "star_ops_pipeline", to: "star_bet_growth", label: "accelerates" }
    ]
  };
}
