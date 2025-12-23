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
  leads: '#FFBB95',
  negotiation: '#6B1488',
  signed: '#22C55E',
};

// Fixed color mapping for lifestyle categories - consistent across all charts
const CATEGORY_COLOR_MAP: Record<string, string> = {
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
  };

  return (
    <div className="space-y-8">
      {/* Leadership Summary */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blckbx-black rounded-2xl p-6 text-blckbx-sand"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl font-semibold">Leadership Summary</h2>
            <p className="text-blckbx-sand/60 text-sm mt-1">
              Week of {format(subDays(new Date(), 7), 'MMM d')} - {format(new Date(), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg">
            <svg className="w-5 h-5 text-blckbx-alert" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">Avg. Time to Sign: <span className="font-semibold text-blckbx-alert">{weeklyStats.avgDaysToSign} days</span></span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <motion.div 
            custom={0}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-white/5 rounded-xl p-4 border border-white/10"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-blckbx-alert" />
              <span className="text-sm text-blckbx-sand/60">New Leads</span>
            </div>
            <p className="text-3xl font-display font-semibold">{weeklyStats.newLeads}</p>
          </motion.div>

          <motion.div 
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-white/5 rounded-xl p-4 border border-white/10"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-blckbx-cta" />
              <span className="text-sm text-blckbx-sand/60">In Negotiation</span>
            </div>
            <p className="text-3xl font-display font-semibold">{weeklyStats.inNegotiation}</p>
          </motion.div>

          <motion.div 
            custom={2}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-white/5 rounded-xl p-4 border border-white/10"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-blckbx-sand/60">Signed</span>
            </div>
            <p className="text-3xl font-display font-semibold">{weeklyStats.signed}</p>
          </motion.div>

          <motion.div 
            custom={3}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-gradient-to-br from-blckbx-cta/20 to-blckbx-alert/20 rounded-xl p-4 border border-blckbx-cta/30"
          >
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-blckbx-cta" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-sm text-blckbx-sand/60">Conversion</span>
            </div>
            <p className="text-3xl font-display font-semibold">
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
                <div className="w-10 h-10 rounded-lg bg-blckbx-cta/20 flex items-center justify-center">
                  <span className="text-blckbx-cta font-semibold">{item.value}</span>
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
          className="bg-white rounded-2xl p-6 shadow-sm border border-blckbx-dark-sand stat-card"
        >
          <h3 className="font-display text-xl font-semibold text-blckbx-black mb-4">Pipeline Overview</h3>
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
                <span className="text-sm text-blckbx-black/70">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Negotiation Funnel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-blckbx-dark-sand stat-card"
        >
          <h3 className="font-display text-xl font-semibold text-blckbx-black mb-4">Negotiation Funnel</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={negotiationData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fill: '#1C1D1F', fontSize: 12 }}
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
                  cursor={{ fill: 'rgba(107, 20, 136, 0.1)' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#6B1488" 
                  radius={[0, 4, 4, 0]}
                  barSize={30}
                />
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
        className="bg-white rounded-2xl p-6 shadow-sm border border-blckbx-dark-sand"
      >
        <h3 className="font-display text-xl font-semibold text-blckbx-black mb-6">Lifestyle Categories by Status</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Contacted Categories */}
          <div className="border border-blckbx-dark-sand rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-blue-400" />
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
                      className="text-xs text-blckbx-cta hover:underline mt-2"
                    >
                      {expandedStatus === 'contacted' ? 'Show less' : `+${contactedCategoryData.length - 3} more`}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Leads Categories */}
          <div className="border border-blckbx-dark-sand rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-blckbx-alert" />
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
                      className="text-xs text-blckbx-cta hover:underline mt-2"
                    >
                      {expandedStatus === 'lead' ? 'Show less' : `+${leadsCategoryData.length - 3} more`}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Negotiation Categories */}
          <div className="border border-blckbx-dark-sand rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-blckbx-cta" />
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
                      className="text-xs text-blckbx-cta hover:underline mt-2"
                    >
                      {expandedStatus === 'negotiation' ? 'Show less' : `+${negotiationCategoryData.length - 3} more`}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Signed Categories */}
          <div className="border border-blckbx-dark-sand rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-green-500" />
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
                      className="text-xs text-blckbx-cta hover:underline mt-2"
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
        className="bg-white rounded-2xl p-6 shadow-sm border border-blckbx-dark-sand"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-xl font-semibold text-blckbx-black">Recent Activity</h3>
          <span className="text-sm text-blckbx-black/50">Last 7 days</span>
        </div>
        
        <div className="space-y-4">
          {recentPartners.length === 0 ? (
            <p className="text-blckbx-black/50 text-center py-8">No recent activity</p>
          ) : (
            recentPartners.slice(0, 5).map((partner, i) => (
              <motion.div
                key={partner.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center justify-between p-4 rounded-lg bg-blckbx-sand/50 hover:bg-blckbx-dark-sand transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    partner.status === 'lead' ? 'bg-blckbx-alert/20 text-orange-600' :
                    partner.status === 'negotiation' ? 'bg-blckbx-cta/20 text-blckbx-cta' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {partner.status === 'lead' && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    )}
                    {partner.status === 'negotiation' && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    )}
                    {partner.status === 'signed' && (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-blckbx-black">{partner.partner_name}</p>
                    <p className="text-sm text-blckbx-black/50">{partner.lifestyle_category} • {partner.opportunity_type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    partner.status === 'lead' ? 'bg-blckbx-alert/20 text-orange-700' :
                    partner.status === 'negotiation' ? 'bg-blckbx-cta/20 text-blckbx-cta' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {partner.status.charAt(0).toUpperCase() + partner.status.slice(1)}
                  </span>
                  <p className="text-xs text-blckbx-black/40 mt-1">
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
