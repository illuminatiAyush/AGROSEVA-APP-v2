// Deep Reinforcement Learning Models

export interface DRLAction {
  type: 'irrigate' | 'fertilize' | 'skip';
  zone: string;
  amount: number;
  timestamp: Date;
}

export interface DRLReward {
  action: DRLAction;
  reward: number; // Positive for good outcomes, negative for waste
  factors: {
    waterEfficiency: number;
    cropHealth: number;
    resourceWaste: number;
    soilBalance: number;
  };
  timestamp: Date;
}

export interface DRLState {
  soilData: any;
  weatherData: any;
  resourceUsage: any;
  previousActions: DRLAction[];
  cumulativeReward: number;
}

