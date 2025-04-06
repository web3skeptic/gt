// Mock initial data
export const initialExercises = [
    {
        name: "Bench Press",
        history: [
            {
                weight: 135.5,
                repetitions: 8,
                note: "Felt good, could go heavier next time",
                timestamp: 1712246400000 // April 4, 2025
            },
            {
                weight: 145,
                repetitions: 6,
                note: "Struggled with last rep",
                timestamp: 1712332800000 // April 5, 2025
            }
        ]
    },
    {
        name: "Squats",
        history: [
            {
                weight: 185,
                repetitions: 10,
                note: "Focus on depth",
                timestamp: 1712246400000 // April 4, 2025
            }
        ]
    },
    {
        name: "Deadlift",
        history: [
            {
                weight: 225,
                repetitions: 5,
                note: "Keep back straight",
                timestamp: 1712073600000 // April 2, 2025
            }
        ]
    },
    {
        name: "Pull Ups",
        history: [
            {
                weight: 0,
                repetitions: 12,
                note: "Bodyweight only",
                timestamp: 1712160000000 // April 3, 2025
            }
        ]
    }
];
  
export const initialActiveExercises = ["Bench Press", "Squats"];