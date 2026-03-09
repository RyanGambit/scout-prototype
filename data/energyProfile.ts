import { BuildingData } from '../types';

export const generateMonthlyProfile = (data: BuildingData) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // 1. Determine Annual Totals
    const totalElec = data.elecUsage || 0;
    const totalGas = data.gasUsage || 0;
    
    // 2. Identify System Types
    const isElectricHeat = data.heatingSystem?.toLowerCase().includes('electric') || 
                          data.heatingSystem?.toLowerCase().includes('heat pump');
    const hasCooling = data.coolingSystem && !data.coolingSystem.toLowerCase().includes('none');
    
    // 3. Define Seasonal Profiles (Typical Canadian Climate - Zone 5/6)
    // Heating: Peak in Jan/Feb
    const heatingProfile = [0.18, 0.16, 0.13, 0.08, 0.04, 0.01, 0.00, 0.00, 0.02, 0.07, 0.12, 0.19]; 
    // Cooling: Peak in Jul/Aug
    const coolingProfile = [0.00, 0.00, 0.01, 0.03, 0.10, 0.20, 0.25, 0.22, 0.12, 0.05, 0.01, 0.01];
    // Base Load: Flat
    const baseProfile = Array(12).fill(1/12);

    // 4. Allocate Loads
    let elecBaseRatio = 0.4;
    let elecHeatRatio = 0.45;
    let elecCoolRatio = 0.15;

    let gasBaseRatio = 0.15;
    let gasHeatRatio = 0.85;

    // Adjust ratios based on process load type
    if (data.processLoadType === 'Data Center') {
        elecBaseRatio = 0.8; elecHeatRatio = 0.0; elecCoolRatio = 0.2;
    } else if (data.processLoadType === 'Commercial Kitchen') {
        gasBaseRatio = 0.5; gasHeatRatio = 0.5;
        elecBaseRatio = 0.6; elecHeatRatio = 0.2; elecCoolRatio = 0.2;
    } else if (data.processLoadType === 'Refrigeration') {
        elecBaseRatio = 0.7; elecHeatRatio = 0.1; elecCoolRatio = 0.2;
    } else if (data.processLoadType === 'Manufacturing') {
        elecBaseRatio = 0.6; elecHeatRatio = 0.2; elecCoolRatio = 0.2;
        gasBaseRatio = 0.4; gasHeatRatio = 0.6;
    }

    let elecBaseLoad = 0;
    let elecHeatingLoad = 0;
    let elecCoolingLoad = 0;
    
    let gasBaseLoad = 0;
    let gasHeatingLoad = 0;

    // GAS ALLOCATION
    if (totalGas > 0) {
        gasBaseLoad = totalGas * gasBaseRatio;
        gasHeatingLoad = totalGas * gasHeatRatio;
    }

    // ELECTRICITY ALLOCATION
    if (totalElec > 0) {
        if (data.processLoadType) {
            // If process load is defined, use the overridden ratios
            elecBaseLoad = totalElec * elecBaseRatio;
            elecHeatingLoad = totalElec * elecHeatRatio;
            elecCoolingLoad = totalElec * elecCoolRatio;
        } else if (isElectricHeat) {
            // Electric Heat Case: High heating load
            if (hasCooling) {
                elecBaseLoad = totalElec * 0.40; // Lighting, Plug, Fans
                elecHeatingLoad = totalElec * 0.45;
                elecCoolingLoad = totalElec * 0.15;
            } else {
                elecBaseLoad = totalElec * 0.50;
                elecHeatingLoad = totalElec * 0.50;
                elecCoolingLoad = 0;
            }
        } else {
            // Gas Heat Case: Electricity is Cooling + Base
            if (hasCooling) {
                elecBaseLoad = totalElec * 0.60;
                elecHeatingLoad = 0;
                elecCoolingLoad = totalElec * 0.40;
            } else {
                elecBaseLoad = totalElec * 1.0;
                elecHeatingLoad = 0;
                elecCoolingLoad = 0;
            }
        }
    }

    // 5. Generate Monthly Data
    return months.map((month, i) => {
        // Calculate Monthly Components
        // Base Load is flat across year
        const mElecBase = elecBaseLoad * (1/12);
        
        // Heating follows heating profile
        const mElecHeat = elecHeatingLoad * heatingProfile[i];
        
        // Cooling follows cooling profile
        const mElecCool = elecCoolingLoad * coolingProfile[i];
        
        const mGasBase = gasBaseLoad * (1/12);
        const mGasHeat = gasHeatingLoad * heatingProfile[i];

        // Add Random Noise (+/- 5%) to make it look realistic
        const noise = 0.95 + Math.random() * 0.10;

        const monthlyElec = (mElecBase + mElecHeat + mElecCool) * noise;
        const monthlyGas = (mGasBase + mGasHeat) * noise;

        // Estimate Cost (Simple Blended Rates)
        // Elec: ~$0.16/kWh, Gas: ~$0.45/m3 (approx ON rates)
        const cost = (monthlyElec * 0.16) + (monthlyGas * 0.45);

        return {
            month,
            elec: Math.round(monthlyElec),
            gas: Math.round(monthlyGas),
            cost: Math.round(cost)
        };
    });
};
