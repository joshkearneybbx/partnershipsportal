'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { WeeklyStats, PipelineStats, Partner } from '@/types';
import { format, subDays, isAfter } from 'date-fns';

interface DashboardProps {
  weeklyStats: WeeklyStats;
  pipelineStats: PipelineStats;
  partners: Partner[];
}

const COLORS = {
  potential: '#FACC15',
  contacted: '#3B82F6',
  leads: '#8B5CF6',
  negotiation: '#F4A858',
  signed: '#1EA988',
};

// Fixed color mapping for lifestyle categories - consistent across all charts
const CATEGORY_COLOR_MAP: Record<string, string> = {
  'Airline': '#0369A1',
  'Travel': '#6B1488',
  'Hotels': '#FFBB95',
  'Supermarkets': '#22C55E',
  'Restaurants': '#3B82F6',
  'Trades': '#EF4444',
  'Misc': '#F59E0B',
  'Childcare': '#8B5CF6',
  'Kids + Family': '#EC4899',
  'Services': '#14B8A6',
  'Eldercare': '#64748B',
  'Taxis': '#DC2626',
  'Flowers': '#059669',
  'Department Store': '#7C3AED',
  'Affiliates': '#DB2777',
  'Beauty': '#0891B2',
  'Retail': '#0D9488',
  'Jewellery': '#C026D3',
  'Cars': '#EA580C',
  'Electronics': '#4F46E5',
  'Home': '#16A34A',
  'Health + Fitness': '#E11D48',
};

// Fallback colors for any new categories
const FALLBACK_COLORS = ['#6366F1', '#84CC16', '#F97316', '#06B6D4', '#A855F7'];

// Custom tooltip for category pie charts
const CategoryTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-blckbx-black px-3 py-2 rounded-lg shadow-lg">
        <p className="text-blckbx-sand text-sm font-medium">{data.name}</p>
        <p className="text-blckbx-sand/70 text-xs">{data.value} partners</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard({ weeklyStats, pipelineStats, partners }: DashboardProps) {
  const [expandedStatus, setExpandedStatus] = useState<string | null>(null);

  const pieData = [
    { name: 'Potential', value: pipelineStats.potential, color: COLORS.potential },
    { name: 'Contacted', value: pipelineStats.contacted, color: COLORS.contacted },
    { name: 'Leads', value: pipelineStats.leads, color: COLORS.leads },
    { name: 'Negotiation', value: pipelineStats.negotiation, color: COLORS.negotiation },
    { name: 'Signed', value: pipelineStats.signed, color: COLORS.signed },
  ];

  const negotiationData = [
    { name: 'Contacted', value: pipelineStats.contacted },
    { name: 'Call Booked', value: weeklyStats.callsBooked },
    { name: 'Call Had', value: weeklyStats.callsHad },
    { name: 'Contract Sent', value: weeklyStats.contractsSent },
  ];

  // Calculate lifestyle categories per status
  const getCategoryDataByStatus = (status: string) => {
    const statusPartners = partners.filter(p => p.status === status);
    const categoryCount: Record<string, number> = {};

    statusPartners.forEach(p => {
      categoryCount[p.lifestyle_category] = (categoryCount[p.lifestyle_category] || 0) + 1;
    });

    let fallbackIndex = 0;
    return Object.entries(categoryCount)
      .map(([name, value]) => {
        let color = CATEGORY_COLOR_MAP[name];
        if (!color) {
          color = FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
          fallbackIndex++;
        }
        return { name, value, color };
      })
      .sort((a, b) => b.value - a.value);
  };

  const contactedCategoryData = getCategoryDataByStatus('contacted');
  const potentialCategoryData = getCategoryDataByStatus('potential');
  const leadsCategoryData = getCategoryDataByStatus('lead');
  const negotiationCategoryData = getCategoryDataByStatus('negotiation');
  const signedCategoryData = getCategoryDataByStatus('signed');

  const toggleExpand = (status: string) => {
    setExpandedStatus(expandedStatus === status ? null : status);
  };

  // Get recent activity (last 7 days)
  const sevenDaysAgo = subDays(new Date(), 7);
  const recentPartners = partners.filter(p => isAfter(new Date(p.updated), sevenDaysAgo));

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.5 },
    }),
    hover: {
      y: -4,
      transition: { duration: 0.2 }
    }
  };

  return (
    <div className="space-y-8">
      {/* Leadership Summary */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 text-blckbx-sand"
        style={{
          background: 'linear-gradient(145deg, #1D1C1B 0%, #252422 100%)',
          boxShadow: '0 0 0 1px rgba(230, 177, 72, 0.15), 0 8px 32px rgba(29, 28, 27, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl font-semibold text-white">Leadership Summary</h2>
            <p className="text-blckbx-sand/60 text-sm mt-1">
              Week of {format(subDays(new Date(), 7), 'MMM d')} - {format(new Date(), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'rgba(245, 243, 240, 0.1)', border: '1px solid rgba(245, 243, 240, 0.1)' }}>
            <svg className="w-5 h-5 text-blckbx-sand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-blckbx-sand/80">Avg. Time to Sign: <span className="font-semibold text-white">{weeklyStats.avgDaysToSign} days</span></span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <motion.div
            custom={0}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="rounded-xl p-4 backdrop-blur-md"
            style={{
              background: 'rgba(245, 243, 240, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 4px 12px rgba(29, 28, 27, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-blckbx-alert" />
              <span className="text-sm text-blckbx-black/60">New Leads</span>
            </div>
            <p className="text-3xl font-display font-semibold text-blckbx-black">{weeklyStats.newLeads}</p>
          </motion.div>

          <motion.div
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="rounded-xl p-4 backdrop-blur-md"
            style={{
              background: 'rgba(245, 243, 240, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 4px 12px rgba(29, 28, 27, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-sm text-blckbx-black/60">In Negotiation</span>
            </div>
            <p className="text-3xl font-display font-semibold text-blckbx-black">{weeklyStats.inNegotiation}</p>
          </motion.div>

          <motion.div
            custom={2}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="rounded-xl p-4 backdrop-blur-md"
            style={{
              background: 'rgba(245, 243, 240, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 4px 12px rgba(29, 28, 27, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ background: COLORS.signed }} />
              <span className="text-sm text-blckbx-black/60">Signed</span>
            </div>
            <p className="text-3xl font-display font-semibold text-blckbx-black">{weeklyStats.signed}</p>
          </motion.div>

          <motion.div
            custom={3}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className="rounded-xl p-4 backdrop-blur-md"
            style={{
              background: 'linear-gradient(135deg, #E6B148 0%, #D4A040 100%)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 4px 12px rgba(230, 177, 72, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-blckbx-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-sm text-blckbx-black/70">Conversion</span>
            </div>
            <p className="text-3xl font-display font-semibold text-blckbx-black">
              {pipelineStats.total > 0 ? `${Math.round((pipelineStats.signed / pipelineStats.total) * 100)}%` : '0%'}
            </p>
          </motion.div>
        </div>

        {/* Negotiation Progress */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <h3 className="text-sm font-medium text-blckbx-sand/60 mb-4">Negotiation Progress This Week</h3>
          <div className="grid grid-cols-4 gap-4">
            {negotiationData.map((item, i) => (
              <motion.div
                key={item.name}
                custom={i + 4}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(145deg, #1D1C1B 0%, #2A2927 100%)',
                    boxShadow: '0 4px 10px rgba(29, 28, 27, 0.4), 0 0 0 1px rgba(230, 177, 72, 0.2), inset 0 1px 0 rgba(230, 177, 72, 0.15)'
                  }}
                >
                  <span className="text-white font-semibold">{item.value}</span>
                </div>
                <span className="text-sm text-blckbx-sand/80">{item.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Pipeline Overview Pie Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-6 stat-card"
          style={{
            background: 'linear-gradient(145deg, #1A1918 0%, #1D1C1B 100%)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '0 4px 20px rgba(29, 28, 27, 0.3)'
          }}
        >
          <h3 className="font-display text-xl font-semibold text-blckbx-sand mb-4">Pipeline Overview</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#1C1D1F',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F5F3F0'
                  }}
                  itemStyle={{ color: '#F5F3F0' }}
                  labelStyle={{ color: '#F5F3F0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                <span className="text-sm text-blckbx-sand/70">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Negotiation Funnel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl p-6 stat-card"
          style={{
            background: 'linear-gradient(145deg, #1A1918 0%, #1D1C1B 100%)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '0 4px 20px rgba(29, 28, 27, 0.3)'
          }}
        >
          <h3 className="font-display text-xl font-semibold text-blckbx-sand mb-4">Negotiation Funnel</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={negotiationData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#F5F3F0', fontSize: 12 }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1C1D1F',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F5F3F0'
                  }}
                  itemStyle={{ color: '#F5F3F0' }}
                  labelStyle={{ color: '#F5F3F0' }}
                  cursor={{ fill: 'rgba(244, 168, 88, 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={30}>
                  {negotiationData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.name === 'Contacted' ? '#F5D98A' :
                        entry.name === 'Call Booked' ? '#EACB70' :
                        entry.name === 'Call Had' ? '#DFB75C' :
                        '#D4A040'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Lifestyle Categories by Status */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(145deg, #1A1918 0%, #1D1C1B 100%)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 4px 20px rgba(29, 28, 27, 0.3)'
        }}
      >
        <h3 className="font-display text-xl font-semibold text-blckbx-sand mb-6">Lifestyle Categories by Status</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Potential Categories */}
          <div className="rounded-xl p-4"
              style={{
                background: 'linear-gradient(145deg, #F5F3F0 0%, #EDEBE8 100%)',
                border: '1px solid rgba(29, 28, 27, 0.08)',
                boxShadow: '0 2px 8px rgba(29, 28, 27, 0.06)'
              }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full" style={{ background: COLORS.potential }} />
              <h4 className="font-medium text-blckbx-black">Potential</h4>
              <span className="text-sm text-blckbx-black/50">({pipelineStats.potential})</span>
            </div>
            {potentialCategoryData.length === 0 ? (
              <p className="text-blckbx-black/50 text-center py-8 text-sm">No potential yet</p>
            ) : (
              <>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={potentialCategoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={55}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {potentialCategoryData.map((entry, index) => (
                          <Cell key={`potential-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CategoryTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3">
                  <AnimatePresence mode="wait">
                    {expandedStatus === 'potential' ? (
                      <motion.div
                        key="expanded"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-2"
                      >
                        {potentialCategoryData.map((item) => (
                          <div key={item.name} className="flex items-center gap-1.5 text-xs">
                            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                            <span className="text-blckbx-black/70">{item.name}: {item.value}</span>
                          </div>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="collapsed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-wrap gap-2"
                      >
                        {potentialCategoryData.slice(0, 3).map((item) => (
                          <div key={item.name} className="flex items-center gap-1.5 text-xs">
                            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                            <span className="text-blckbx-black/70">{item.name}: {item.value}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {potentialCategoryData.length > 3 && (
                    <button
                      onClick={() => toggleExpand('potential')}
                      className="text-xs text-blckbx-sand/70 hover:text-white hover:underline mt-2 transition-colors"
                    >
                      {expandedStatus === 'potential' ? 'Show less' : `+${potentialCategoryData.length - 3} more`}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Contacted Categories */}
          <div className="rounded-xl p-4"
              style={{
                background: 'linear-gradient(145deg, #F5F3F0 0%, #EDEBE8 100%)',
                border: '1px solid rgba(29, 28, 27, 0.08)',
                boxShadow: '0 2px 8px rgba(29, 28, 27, 0.06)'
              }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full" style={{ background: COLORS.contacted }} />
              <h4 className="font-medium text-blckbx-black">Contacted</h4>
              <span className="text-sm text-blckbx-black/50">({pipelineStats.contacted})</span>
            </div>
            {contactedCategoryData.length === 0 ? (
              <p className="text-blckbx-black/50 text-center py-8 text-sm">No contacted yet</p>
            ) : (
              <>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={contactedCategoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={55}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {contactedCategoryData.map((entry, index) => (
                          <Cell key={`contacted-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CategoryTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3">
                  <AnimatePresence mode="wait">
                    {expandedStatus === 'contacted' ? (
                      <motion.div
                        key="expanded"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-2"
                      >
                        {contactedCategoryData.map((item) => (
                          <div key={item.name} className="flex items-center gap-1.5 text-xs">
                            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                            <span className="text-blckbx-black/70">{item.name}: {item.value}</span>
                          </div>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="collapsed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-wrap gap-2"
                      >
                        {contactedCategoryData.slice(0, 3).map((item) => (
                          <div key={item.name} className="flex items-center gap-1.5 text-xs">
                            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                            <span className="text-blckbx-black/70">{item.name}: {item.value}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {contactedCategoryData.length > 3 && (
                    <button
                      onClick={() => toggleExpand('contacted')}
                      className="text-xs text-blckbx-sand/70 hover:text-white hover:underline mt-2 transition-colors"
                    >
                      {expandedStatus === 'contacted' ? 'Show less' : `+${contactedCategoryData.length - 3} more`}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Leads Categories */}
          <div className="rounded-xl p-4"
              style={{
                background: 'linear-gradient(145deg, #F5F3F0 0%, #EDEBE8 100%)',
                border: '1px solid rgba(29, 28, 27, 0.08)',
                boxShadow: '0 2px 8px rgba(29, 28, 27, 0.06)'
              }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full" style={{ background: COLORS.leads }} />
              <h4 className="font-medium text-blckbx-black">Leads</h4>
              <span className="text-sm text-blckbx-black/50">({pipelineStats.leads})</span>
            </div>
            {leadsCategoryData.length === 0 ? (
              <p className="text-blckbx-black/50 text-center py-8 text-sm">No leads yet</p>
            ) : (
              <>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={leadsCategoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={55}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {leadsCategoryData.map((entry, index) => (
                          <Cell key={`lead-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CategoryTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3">
                  <AnimatePresence mode="wait">
                    {expandedStatus === 'lead' ? (
                      <motion.div
                        key="expanded"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-2"
                      >
                        {leadsCategoryData.map((item) => (
                          <div key={item.name} className="flex items-center gap-1.5 text-xs">
                            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                            <span className="text-blckbx-black/70">{item.name}: {item.value}</span>
                          </div>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="collapsed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-wrap gap-2"
                      >
                        {leadsCategoryData.slice(0, 3).map((item) => (
                          <div key={item.name} className="flex items-center gap-1.5 text-xs">
                            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                            <span className="text-blckbx-black/70">{item.name}: {item.value}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {leadsCategoryData.length > 3 && (
                    <button
                      onClick={() => toggleExpand('lead')}
                      className="text-xs text-blckbx-sand/70 hover:text-white hover:underline mt-2 transition-colors"
                    >
                      {expandedStatus === 'lead' ? 'Show less' : `+${leadsCategoryData.length - 3} more`}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Negotiation Categories */}
          <div className="rounded-xl p-4"
              style={{
                background: 'linear-gradient(145deg, #F5F3F0 0%, #EDEBE8 100%)',
                border: '1px solid rgba(29, 28, 27, 0.08)',
                boxShadow: '0 2px 8px rgba(29, 28, 27, 0.06)'
              }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full" style={{ background: COLORS.negotiation }} />
              <h4 className="font-medium text-blckbx-black">Negotiation</h4>
              <span className="text-sm text-blckbx-black/50">({pipelineStats.negotiation})</span>
            </div>
            {negotiationCategoryData.length === 0 ? (
              <p className="text-blckbx-black/50 text-center py-8 text-sm">No partners in negotiation</p>
            ) : (
              <>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={negotiationCategoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={55}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {negotiationCategoryData.map((entry, index) => (
                          <Cell key={`neg-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CategoryTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3">
                  <AnimatePresence mode="wait">
                    {expandedStatus === 'negotiation' ? (
                      <motion.div
                        key="expanded"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-2"
                      >
                        {negotiationCategoryData.map((item) => (
                          <div key={item.name} className="flex items-center gap-1.5 text-xs">
                            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                            <span className="text-blckbx-black/70">{item.name}: {item.value}</span>
                          </div>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="collapsed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-wrap gap-2"
                      >
                        {negotiationCategoryData.slice(0, 3).map((item) => (
                          <div key={item.name} className="flex items-center gap-1.5 text-xs">
                            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                            <span className="text-blckbx-black/70">{item.name}: {item.value}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {negotiationCategoryData.length > 3 && (
                    <button
                      onClick={() => toggleExpand('negotiation')}
                      className="text-xs text-blckbx-sand/70 hover:text-white hover:underline mt-2 transition-colors"
                    >
                      {expandedStatus === 'negotiation' ? 'Show less' : `+${negotiationCategoryData.length - 3} more`}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Signed Categories */}
          <div className="rounded-xl p-4"
              style={{
                background: 'linear-gradient(145deg, #F5F3F0 0%, #EDEBE8 100%)',
                border: '1px solid rgba(29, 28, 27, 0.08)',
                boxShadow: '0 2px 8px rgba(29, 28, 27, 0.06)'
              }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full" style={{ background: COLORS.signed }} />
              <h4 className="font-medium text-blckbx-black">Signed</h4>
              <span className="text-sm text-blckbx-black/50">({pipelineStats.signed})</span>
            </div>
            {signedCategoryData.length === 0 ? (
              <p className="text-blckbx-black/50 text-center py-8 text-sm">No signed partners</p>
            ) : (
              <>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={signedCategoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={55}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                      >
                        {signedCategoryData.map((entry, index) => (
                          <Cell key={`signed-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CategoryTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3">
                  <AnimatePresence mode="wait">
                    {expandedStatus === 'signed' ? (
                      <motion.div
                        key="expanded"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-2"
                      >
                        {signedCategoryData.map((item) => (
                          <div key={item.name} className="flex items-center gap-1.5 text-xs">
                            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                            <span className="text-blckbx-black/70">{item.name}: {item.value}</span>
                          </div>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="collapsed"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-wrap gap-2"
                      >
                        {signedCategoryData.slice(0, 3).map((item) => (
                          <div key={item.name} className="flex items-center gap-1.5 text-xs">
                            <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                            <span className="text-blckbx-black/70">{item.name}: {item.value}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {signedCategoryData.length > 3 && (
                    <button
                      onClick={() => toggleExpand('signed')}
                      className="text-xs text-blckbx-sand/70 hover:text-white hover:underline mt-2 transition-colors"
                    >
                      {expandedStatus === 'signed' ? 'Show less' : `+${signedCategoryData.length - 3} more`}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </motion.section>

      {/* Recent Activity */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(145deg, #1A1918 0%, #1D1C1B 100%)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 4px 20px rgba(29, 28, 27, 0.3)'
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-xl font-semibold text-blckbx-sand">Recent Activity</h3>
          <span className="text-sm text-blckbx-sand/50">Last 7 days</span>
        </div>

        <div className="space-y-4">
          {recentPartners.length === 0 ? (
            <p className="text-blckbx-sand/50 text-center py-8">No recent activity</p>
          ) : (
            recentPartners.slice(0, 5).map((partner, i) => (
              <motion.div
                key={partner.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center justify-between p-4 rounded-lg transition-colors"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.04)'
                }}
                whileHover={{ background: 'rgba(255, 255, 255, 0.06)' }}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    partner.status === 'potential' ? 'bg-yellow-400/20 text-yellow-400' :
                    partner.status === 'contacted' ? 'bg-blue-500/20 text-blue-400' :
                    partner.status === 'lead' ? 'bg-purple-500/20 text-purple-400' :
                    partner.status === 'negotiation' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-blckbx-success-light/20 text-blckbx-success-light'
                  }`}>
                    {partner.status === 'potential' && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    )}
                    {partner.status === 'contacted' && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                    )}
                    {partner.status === 'lead' && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    )}
                    {partner.status === 'negotiation' && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    )}
                    {partner.status === 'signed' && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-blckbx-sand">{partner.partner_name}</p>
                    <p className="text-sm text-blckbx-sand/50">{partner.lifestyle_category} • {partner.opportunity_type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium text-white ${
                    partner.status === 'potential' ? 'bg-yellow-400' :
                    partner.status === 'contacted' ? 'bg-blue-500' :
                    partner.status === 'lead' ? 'bg-purple-500' :
                    partner.status === 'negotiation' ? 'bg-orange-500' :
                    'bg-blckbx-success'
                  }`}>
                    {partner.status.charAt(0).toUpperCase() + partner.status.slice(1)}
                  </span>
                  <p className="text-xs text-blckbx-sand/40 mt-1">
                    {format(new Date(partner.updated), 'MMM d, h:mm a')}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.section>
    </div>
  );
}
