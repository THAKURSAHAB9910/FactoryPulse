"""
FactoryPulse Manufacturing Data Simulator
Generates 500,000+ realistic manufacturing events across production, downtime, quality, and sensors.
Includes intentional duplicates and corrupt records to test ETL validation & quarantine mechanisms.
"""

import uuid
import random
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple, Any
import numpy as np
import pandas as pd

from .config import MACHINES, PRODUCTS, SHIFTS, DOWNTIME_REASONS, DEFECT_REASONS

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("Simulator")

class ManufacturingDataSimulator:
    def __init__(
        self,
        start_date: datetime = datetime(2026, 8, 1, 0, 0, 0, tzinfo=timezone.utc),
        end_date: datetime = datetime(2026, 9, 17, 0, 0, 0, tzinfo=timezone.utc),
        seed: int = 42
    ):
        self.start_date = start_date
        self.end_date = end_date
        self.total_days = (end_date - start_date).days
        self.seed = seed
        np.random.seed(seed)
        random.seed(seed)

    def _get_shift(self, dt: datetime) -> str:
        hour = dt.hour
        if 6 <= hour < 14:
            return "SHIFT-M"
        elif 14 <= hour < 22:
            return "SHIFT-A"
        else:
            return "SHIFT-N"

    def _date_to_key(self, dt: datetime) -> int:
        return int(dt.strftime("%Y%m%d"))

    def generate_all(
        self,
        target_production: int = 300000,
        target_sensors: int = 160000,
        target_downtime: int = 15000,
        target_quality: int = 35000
    ) -> Dict[str, pd.DataFrame]:
        """
        Generates full multi-stream manufacturing data totaling >500,000 records.
        """
        logger.info("Starting simulation of >500,000 manufacturing records...")
        
        prod_df = self.generate_production_events(target_production)
        sensor_df = self.generate_sensor_telemetry(target_sensors)
        downtime_df = self.generate_downtime_events(target_downtime)
        quality_df = self.generate_quality_events(target_quality)
        
        total_records = len(prod_df) + len(sensor_df) + len(downtime_df) + len(quality_df)
        logger.info(f"Simulation completed! Generated {total_records:,} total records across 4 fact streams.")
        
        return {
            "production": prod_df,
            "sensor_telemetry": sensor_df,
            "downtime": downtime_df,
            "quality": quality_df,
        }

    def generate_production_events(self, count: int = 300000) -> pd.DataFrame:
        logger.info(f"Generating {count:,} production events...")
        records = []
        
        # Precompute machine choices and probabilities
        mch_indices = np.random.choice(len(MACHINES), size=count)
        prod_indices = np.random.choice(len(PRODUCTS), size=count)
        
        # Generate random time offsets (in seconds) between start_date and end_date
        total_seconds = int((self.end_date - self.start_date).total_seconds())
        time_offsets = np.random.randint(0, total_seconds, size=count)
        time_offsets.sort()
        
        for i in range(count):
            mch = MACHINES[mch_indices[i]]
            prod = PRODUCTS[prod_indices[i]]
            ev_time = self.start_date + timedelta(seconds=int(time_offsets[i]))
            
            ideal_cycle = float(mch["ideal_cycle_time_sec"])
            # Actual cycle time: normal distribution + slight right skew for micro-hesitations
            actual_cycle = max(
                ideal_cycle * 0.85,
                round(float(np.random.normal(loc=ideal_cycle * 1.05, scale=ideal_cycle * 0.12)), 2)
            )
            
            # Quality flags
            r_val = random.random()
            is_scrap = r_val < mch["scrap_prob"]
            is_rework = (not is_scrap) and (r_val < (mch["scrap_prob"] + mch["rework_prob"]))
            is_good = not is_scrap and not is_rework
            
            # Realistic power usage during cycle
            energy_kwh = round((mch["base_power_kw"] * (actual_cycle / 3600.0)) * random.uniform(0.9, 1.1), 4)
            
            batch_num = (ev_time.day % 10) + 1
            batch_id = f"BATCH-{ev_time.strftime('%Y%m%d')}-{mch['line_id']}-{batch_num:02d}"
            part_serial = f"FP-{mch['machine_id']}-{ev_time.strftime('%Y%m%d%H%M%S')}-{i:07d}"
            
            records.append({
                "production_id": str(uuid.uuid4()),
                "event_timestamp": ev_time,
                "date_key": self._date_to_key(ev_time),
                "factory_id": mch["factory_id"],
                "line_id": mch["line_id"],
                "machine_id": mch["machine_id"],
                "product_id": prod["product_id"],
                "shift_id": self._get_shift(ev_time),
                "batch_id": batch_id,
                "part_serial_number": part_serial,
                "ideal_cycle_time_sec": ideal_cycle,
                "actual_cycle_time_sec": actual_cycle,
                "is_good_part": is_good,
                "is_rework": is_rework,
                "is_scrap": is_scrap,
                "energy_kwh": energy_kwh
            })
            
        df = pd.DataFrame(records)
        
        # Inject intentional duplicate records (~0.5%) to test deduplication in ETL
        dup_count = int(count * 0.005)
        duplicates = df.sample(dup_count, random_state=self.seed)
        
        # Inject intentional corrupted records (~0.2%) to test quarantine logic in ETL
        corrupt_records = []
        for j in range(int(count * 0.002)):
            corrupt_records.append({
                "production_id": str(uuid.uuid4()),
                "event_timestamp": "INVALID_TIMESTAMP_STRING",
                "date_key": 99999999,
                "factory_id": "UNKNOWN_FACT",
                "line_id": "UNKNOWN_LINE",
                "machine_id": "NON_EXISTENT_MACHINE",
                "product_id": "BAD_PROD",
                "shift_id": "SHIFT_X",
                "batch_id": "CORRUPT_BATCH",
                "part_serial_number": f"CORRUPT-{j}",
                "ideal_cycle_time_sec": -50.0, # Negative cycle time is invalid
                "actual_cycle_time_sec": -10.0,
                "is_good_part": False,
                "is_rework": False,
                "is_scrap": True,
                "energy_kwh": -99.9
            })
        corrupt_df = pd.DataFrame(corrupt_records)
        
        full_df = pd.concat([df, duplicates, corrupt_df], ignore_index=True)
        logger.info(f"Production generation done: {len(full_df):,} records (including {dup_count} duplicates and {len(corrupt_df)} quarantine candidates).")
        return full_df

    def generate_sensor_telemetry(self, count: int = 160000) -> pd.DataFrame:
        logger.info(f"Generating {count:,} sensor telemetry readings...")
        records = []
        
        total_seconds = int((self.end_date - self.start_date).total_seconds())
        time_offsets = np.random.randint(0, total_seconds, size=count)
        time_offsets.sort()
        mch_indices = np.random.choice(len(MACHINES), size=count)
        
        for i in range(count):
            mch = MACHINES[mch_indices[i]]
            rec_time = self.start_date + timedelta(seconds=int(time_offsets[i]))
            
            # Anomaly injection: ~3.5% of readings simulate impending bearing wear, overheating or hydraulic cavitation
            is_anomaly = random.random() < 0.035
            
            if is_anomaly:
                vibration = round(float(np.random.uniform(4.5, 9.8)), 3) # High vibration
                temperature = round(float(np.random.uniform(85.0, 115.0)), 2) # Critical temp
                pressure = round(float(mch["base_pressure_bar"] * np.random.uniform(0.5, 1.6)), 2)
                power = round(float(mch["base_power_kw"] * np.random.uniform(1.3, 1.9)), 2)
                rpm = round(float(mch["base_rpm"] * np.random.uniform(0.7, 1.15)), 1)
            else:
                vibration = round(max(0.1, float(np.random.normal(loc=mch["base_vib_rms"], scale=0.25))), 3)
                temperature = round(float(np.random.normal(loc=mch["base_temp_c"], scale=2.5)), 2)
                pressure = round(float(np.random.normal(loc=mch["base_pressure_bar"], scale=mch["base_pressure_bar"] * 0.03)), 2)
                power = round(float(np.random.normal(loc=mch["base_power_kw"], scale=mch["base_power_kw"] * 0.04)), 2)
                rpm = round(float(np.random.normal(loc=mch["base_rpm"], scale=mch["base_rpm"] * 0.02)), 1)
            
            records.append({
                "telemetry_id": str(uuid.uuid4()),
                "machine_id": mch["machine_id"],
                "recorded_at": rec_time,
                "date_key": self._date_to_key(rec_time),
                "vibration_rms": vibration,
                "temperature_c": temperature,
                "pressure_bar": pressure,
                "power_kw": power,
                "motor_rpm": rpm,
                "is_anomaly": is_anomaly
            })
            
        df = pd.DataFrame(records)
        logger.info(f"Sensor telemetry generation done: {len(df):,} records.")
        return df

    def generate_downtime_events(self, count: int = 15000) -> pd.DataFrame:
        logger.info(f"Generating {count:,} downtime & stoppage events...")
        records = []
        
        reason_ids = [r["reason_id"] for r in DOWNTIME_REASONS]
        reason_weights = [r["weight"] for r in DOWNTIME_REASONS]
        
        total_seconds = int((self.end_date - self.start_date).total_seconds())
        time_offsets = np.random.randint(0, total_seconds - 7200, size=count)
        time_offsets.sort()
        mch_indices = np.random.choice(len(MACHINES), size=count)
        
        for i in range(count):
            mch = MACHINES[mch_indices[i]]
            reason_id = random.choices(reason_ids, weights=reason_weights, k=1)[0]
            start_dt = self.start_date + timedelta(seconds=int(time_offsets[i]))
            
            # Is planned or micro-stoppage vs major failure
            is_planned = reason_id in ["DT-01", "DT-02", "DT-03"]
            
            # Micro-stoppage distribution (< 5 mins) vs Major breakdown (up to 120 mins)
            if random.random() < 0.65 and not is_planned:
                # 65% of unplanned are micro-stoppages
                duration_min = round(float(np.random.uniform(0.5, 4.8)), 2)
                is_micro = True
            elif is_planned:
                duration_min = round(float(np.random.uniform(20.0, 60.0)), 2)
                is_micro = False
            else:
                # Major mechanical/electrical breakdown
                duration_min = round(float(np.random.lognormal(mean=3.0, sigma=0.6)), 2)
                duration_min = min(duration_min, 180.0) # Cap at 3 hours
                is_micro = False
                
            end_dt = start_dt + timedelta(minutes=duration_min)
            
            notes = f"Stoppage on {mch['machine_name']} - Event ID {i:06d}"
            
            records.append({
                "downtime_id": str(uuid.uuid4()),
                "machine_id": mch["machine_id"],
                "shift_id": self._get_shift(start_dt),
                "date_key": self._date_to_key(start_dt),
                "reason_id": reason_id,
                "start_time": start_dt,
                "end_time": end_dt,
                "duration_minutes": duration_min,
                "is_micro_stoppage": is_micro,
                "operator_notes": notes
            })
            
        df = pd.DataFrame(records)
        logger.info(f"Downtime events generation done: {len(df):,} records.")
        return df

    def generate_quality_events(self, count: int = 35000) -> pd.DataFrame:
        logger.info(f"Generating {count:,} quality inspection records...")
        records = []
        
        defect_ids = [d["defect_id"] for d in DEFECT_REASONS]
        defect_weights = [d["weight"] for d in DEFECT_REASONS]
        
        total_seconds = int((self.end_date - self.start_date).total_seconds())
        time_offsets = np.random.randint(0, total_seconds, size=count)
        time_offsets.sort()
        
        for i in range(count):
            mch = random.choice(MACHINES)
            prod = random.choice(PRODUCTS)
            insp_time = self.start_date + timedelta(seconds=int(time_offsets[i]))
            defect_id = random.choices(defect_ids, weights=defect_weights, k=1)[0]
            
            inspected = random.randint(10, 50)
            # Most inspections find 0 defects, some find 1-3 defects
            if random.random() < 0.20:
                defects = random.randint(1, min(4, inspected))
                scrap = random.randint(0, defects)
                rework = defects - scrap
            else:
                defects = 0
                scrap = 0
                rework = 0
                
            defect_rate = round((defects / inspected) * 100, 3)
            scrap_cost = round(scrap * prod["scrap_cost"], 2)
            
            records.append({
                "quality_id": str(uuid.uuid4()),
                "inspection_timestamp": insp_time,
                "date_key": self._date_to_key(insp_time),
                "machine_id": mch["machine_id"],
                "product_id": prod["product_id"],
                "shift_id": self._get_shift(insp_time),
                "defect_id": defect_id if defects > 0 else None,
                "inspected_count": inspected,
                "defect_count": defects,
                "scrap_count": scrap,
                "rework_count": rework,
                "defect_rate_pct": defect_rate,
                "scrap_cost_usd": scrap_cost
            })
            
        df = pd.DataFrame(records)
        logger.info(f"Quality inspections generation done: {len(df):,} records.")
        return df
