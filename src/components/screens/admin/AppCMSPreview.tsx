import React from 'react';
import { motion } from 'motion/react';
import { XCircle, Bell, Grid, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Banner,
  FeaturedCategory,
  QuickAction,
  PromoCard,
  BottomNavItem,
} from './appCmsApi';

interface AppCMSPreviewProps {
  onClose: () => void;
  banners: Banner[];
  featuredCategories: FeaturedCategory[];
  quickActions: QuickAction[];
  promoCards: PromoCard[];
  bottomNavItems: BottomNavItem[];
}

export function AppCMSPreview({
  onClose,
  banners,
  featuredCategories,
  quickActions,
  promoCards,
  bottomNavItems,
}: AppCMSPreviewProps) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-50"
      />
      
      {/* Sliding Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
        className="fixed right-0 top-0 bottom-0 z-50 shadow-2xl flex flex-col items-center justify-center overflow-auto px-6"
        style={{ 
          width: '520px',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #e8eaf6 100%)',
        }}
      >
        {/* Close Button */}
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-700 hover:bg-white/30 z-50"
        >
          <XCircle size={20} />
        </Button>

        {/* iPhone 15 Pro Frame */}
        <div 
          className="relative shadow-2xl"
          style={{
            width: '393px',
            height: '852px',
            borderRadius: '52px',
            boxShadow: '0 30px 60px rgba(0, 0, 0, 0.8)',
            overflow: 'hidden',
          }}
        >
          {/* Screen Reflection */}
          <div 
            className="absolute top-0 left-0 w-full h-[30%] pointer-events-none z-50"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, transparent 100%)',
              borderRadius: '52px 52px 0 0',
            }}
          />

          {/* Phone Screen */}
          <div 
            className="absolute inset-0 bg-white overflow-hidden flex flex-col"
            style={{
              borderRadius: '52px',
            }}
          >
            {/* Status Bar (Fixed) */}
            <div className="h-11 bg-white px-4 flex items-center justify-between text-white text-xs font-semibold relative z-30 flex-shrink-0">
            </div>

            {/* Dynamic Island Notch (Fixed) */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 bg-[#000] z-40 flex items-center justify-center"
              style={{
                top: '0px',
                width: '240px',
                height: '29px',
                borderRadius: '0 0 40px 40px',
              }}
            >
              <div className="w-3 h-3 bg-[#1a1a1a] rounded-full shadow-inner"></div>
            </div>

            {/* Scrollable Content Area */}
            <div 
              className="flex-1 overflow-y-auto overflow-x-hidden"
              style={{
                paddingTop: '29px',
                paddingBottom: '34px',
              }}
            >
              {/* Content Header */}
              <div className="px-4 py-3 bg-white border-b border-[#e5e7eb] flex items-center justify-between">
                <h2 className="text-xl font-bold text-[#1f2937]">App CMS</h2>
                <Badge className="bg-[#dbeafe] text-[#1e40af] hover:bg-[#dbeafe]">
                  4 Published
                </Badge>
              </div>

              {/* Flash Sale Banner */}
              <div className="px-4 pt-4 pb-2">
                <div 
                  className="relative overflow-hidden rounded-xl h-[140px] flex flex-col justify-end p-4"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }}
                >
                  <h3 className="text-white font-bold text-lg mb-1">Flash Sale: Up to 50% Off</h3>
                  <p className="text-white text-sm opacity-90">Get amazing discounts on all items</p>
                </div>
              </div>

              {/* Quick Access Categories */}
              <div className="px-4 py-3">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Reorder', color: '#10b981', icon: 'R' },
                    { label: 'Offers', color: '#f59e0b', icon: 'T' },
                    { label: 'Wallet', color: '#8b5cf6', icon: 'W' },
                    { label: 'Refer', color: '#ec4899', icon: 'G' },
                  ].map((item, index) => (
                    <div 
                      key={index} 
                      className="flex flex-col items-center gap-2 cursor-pointer transition-transform hover:-translate-y-0.5"
                    >
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: item.color }}
                      >
                        <span className="text-white font-bold text-sm">{item.icon}</span>
                      </div>
                      <div className="text-[10px] text-center text-[#1f2937] leading-tight">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Featured Categories Section */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-[#1f2937]">Featured Categories</h3>
                  <button className="text-xs text-[#667eea] hover:underline cursor-pointer">See all</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { name: 'Vegetables', gradient: 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)' },
                    { name: 'Fruits', gradient: 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)' },
                    { name: 'Snacks', gradient: 'linear-gradient(135deg, #c084fc 0%, #9333ea 100%)' },
                  ].map((category, index) => (
                    <div 
                      key={index}
                      className="h-[100px] rounded-xl flex items-end p-3"
                      style={{ background: category.gradient }}
                    >
                      <span className="text-white font-bold text-sm">{category.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Popular Items Section */}
              <div className="px-4 py-3">
                <h3 className="font-bold text-[#1f2937] mb-3 mt-2">Popular Items</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Fresh Vegetables Pack', desc: 'Get fresh organic vegetables daily', price: '₹299' },
                    { name: 'Premium Fruits Box', desc: 'Handpicked seasonal fruits', price: '₹449' },
                    { name: 'Organic Spices Kit', desc: 'Pure and authentic Indian spices', price: '₹599' },
                    { name: 'Dairy Products Combo', desc: 'Fresh milk, curd, and butter', price: '₹349' },
                    { name: 'Snacks & Beverages', desc: 'Popular snacks and drinks', price: '₹499' },
                    { name: 'Breakfast Essentials', desc: 'Everything you need for breakfast', price: '₹399' },
                  ].map((product, index) => (
                    <div 
                      key={index}
                      className="border border-[#e5e7eb] rounded-lg p-3 cursor-pointer transition-all hover:border-[#667eea] hover:shadow-md"
                    >
                      <h4 className="font-bold text-sm text-[#1f2937] mb-1">{product.name}</h4>
                      <p className="text-xs text-[#6b7280] mb-2">{product.desc}</p>
                      <p className="text-sm font-bold text-[#667eea]">{product.price}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spacer for bottom nav */}
              <div className="h-16"></div>
            </div>

            {/* Home Indicator (Fixed at bottom) */}
            <div 
              className="absolute bottom-0 left-0 right-0 bg-white flex items-end justify-center"
              style={{ height: '34px', paddingBottom: '8px' }}
            >
              <div className="w-[138px] h-1 bg-gray-400 rounded-full opacity-60"></div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}