
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface GaugeProps {
  value: number;
  label: string;
  color: string;
  isDark?: boolean;
}

const Gauge: React.FC<GaugeProps> = ({ value, label, color, isDark }) => {
  const data = [
    { name: 'Value', value: value },
    { name: 'Remaining', value: 100 - value },
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="h-36 w-36 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={60}
              startAngle={180}
              endAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={color} />
              <Cell fill={isDark ? "#1e293b" : "#e2e8f0"} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
          <span className="text-2xl font-bold transition-colors" style={{ color }}>{value}%</span>
          <span className={`text-[10px] uppercase font-bold tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {label}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Gauge;
