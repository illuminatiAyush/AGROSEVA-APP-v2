// Deep Reinforcement Learning Engine (Lightweight, Conceptual)

import { DRLAction, DRLReward, DRLState } from '@/models/DRL';
import { IrrigationRecommendation, FertilizerRecommendation } from '@/models/Recommendations';
import { ResourceTracking } from '@/models/Resources';

class DRLEngine {
  private cumulativeReward = 0;
  private actionHistory: DRLAction[] = [];

  // Calculate reward for an action based on outcomes
  calculateReward(
    action: DRLAction,
    soilData: any,
    weatherData: any,
    resourceUsage: ResourceTracking
  ): DRLReward {
    let reward = 0;
    const factors = {
      waterEfficiency: 0,
      cropHealth: 0,
      resourceWaste: 0,
      soilBalance: 0,
    };

    // Water efficiency factor
    if (action.type === 'irrigate') {
      const optimalAmount = this.calculateOptimalWater(soilData, weatherData);
      const efficiency = optimalAmount > 0 
        ? Math.max(0, 1 - Math.abs(action.amount - optimalAmount) / optimalAmount)
        : 0;
      factors.waterEfficiency = efficiency * 100;
      reward += efficiency * 50; // Reward for efficient water use
      
      if (action.amount > optimalAmount * 1.5) {
        reward -= 30; // Penalty for over-irrigation (waste)
        factors.resourceWaste = 50;
      }
    } else if (action.type === 'skip' && soilData.moisture.value < 30) {
      reward -= 40; // Penalty for skipping when needed
    }

    // Crop health factor (based on soil conditions)
    const healthScore = this.calculateCropHealth(soilData);
    factors.cropHealth = healthScore;
    reward += healthScore * 0.3;

    // Soil balance factor
    const balanceScore = this.calculateSoilBalance(soilData);
    factors.soilBalance = balanceScore;
    reward += balanceScore * 0.2;

    // Resource waste penalty
    if (factors.resourceWaste > 0) {
      reward -= factors.resourceWaste * 0.5;
    }

    this.cumulativeReward += reward;
    this.actionHistory.push(action);

    return {
      action,
      reward: Math.round(reward * 100) / 100,
      factors,
      timestamp: new Date(),
    };
  }

  // Calculate optimal water amount (simplified)
  private calculateOptimalWater(soilData: any, weatherData: any): number {
    const targetMoisture = 60;
    const currentMoisture = soilData.moisture.value;
    const deficit = targetMoisture - currentMoisture;
    
    if (deficit <= 0) return 0;
    
    // Account for expected rainfall
    const adjustedDeficit = Math.max(0, deficit - weatherData.rainfall * 2);
    return adjustedDeficit * 10; // Liters
  }

  // Calculate crop health score
  private calculateCropHealth(soilData: any): number {
    let score = 100;
    
    // Moisture impact
    if (soilData.moisture.value < 30) score -= 40;
    else if (soilData.moisture.value < 40) score -= 20;
    else if (soilData.moisture.value > 80) score -= 20;

    // pH impact
    if (soilData.pH.value < 6.0 || soilData.pH.value > 8.0) score -= 30;
    else if (soilData.pH.value < 6.5 || soilData.pH.value > 7.5) score -= 15;

    // NPK impact
    const avgNPK = (soilData.npk.nitrogen + soilData.npk.phosphorus + soilData.npk.potassium) / 3;
    if (avgNPK < 30) score -= 30;
    else if (avgNPK < 40) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  // Calculate soil balance score
  private calculateSoilBalance(soilData: any): number {
    const npk = soilData.npk;
    const ideal = 50;
    
    const nitrogenBalance = 100 - Math.abs(npk.nitrogen - ideal) * 2;
    const phosphorusBalance = 100 - Math.abs(npk.phosphorus - ideal) * 2;
    const potassiumBalance = 100 - Math.abs(npk.potassium - ideal) * 2;

    return (nitrogenBalance + phosphorusBalance + potassiumBalance) / 3;
  }

  // Get current state
  getState(soilData: any, weatherData: any, resourceUsage: ResourceTracking): DRLState {
    return {
      soilData,
      weatherData,
      resourceUsage,
      previousActions: [...this.actionHistory],
      cumulativeReward: this.cumulativeReward,
    };
  }

  // Reset engine
  reset() {
    this.cumulativeReward = 0;
    this.actionHistory = [];
  }
}

export const drlEngine = new DRLEngine();

