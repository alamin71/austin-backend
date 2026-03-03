import { SubscriptionTier } from '../app/modules/subscription/subscription.model.js';
import { logger } from '../shared/logger.js';
import { connectToDatabase } from '../DB/db.js';

/**
 * Seed default subscription tiers from Figma design
 * Run: npm run seed:tiers
 */

const defaultTiers = [
  {
    name: 'Supporter',
    slug: 'supporter',
    price: 3.99,
    billingPeriod: 'monthly',
    
    // Feature flags
    adFree: true,
    chatBadge: true,
    creatorOnlyPosts: true,
    earlyStreamAccess: false,
    vipRoomAccess: false,
    directQA: false,
    earlyContentAccess: false,
    
    // Bonuses
    pulsePointsBonus: 0,
    marketplaceDiscount: 0,
    
    features: [
      'Ad-free experience',
      'Chat badge',
      'Access creator-only posts',
      'Supporter badge',
    ],
    
    badge: {
      icon: '🎗️',
      displayName: 'Supporter',
    },
    
    isActive: true,
  },
  {
    name: 'Premium',
    slug: 'premium',
    price: 7.99,
    billingPeriod: 'monthly',
    
    // Feature flags
    adFree: true,
    chatBadge: true,
    creatorOnlyPosts: true,
    earlyStreamAccess: true,
    vipRoomAccess: false,
    directQA: false,
    earlyContentAccess: false,
    
    // Bonuses
    pulsePointsBonus: 25, // +25% bonus
    marketplaceDiscount: 5, // 5x discount
    
    features: [
      'Everything in Supporter',
      'Early stream access',
      '+25% Pulse Points bonus',
      '5x marketplace discount',
      'Premium badge',
    ],
    
    badge: {
      icon: '⭐',
      displayName: 'Premium',
    },
    
    isActive: true,
  },
  {
    name: 'Exclusive',
    slug: 'exclusive',
    price: 14.99,
    billingPeriod: 'monthly',
    
    // Feature flags
    adFree: true,
    chatBadge: true,
    creatorOnlyPosts: true,
    earlyStreamAccess: true,
    vipRoomAccess: true,
    directQA: true,
    earlyContentAccess: true,
    
    // Bonuses
    pulsePointsBonus: 50, // +50x bonus
    marketplaceDiscount: 10, // 10% discount
    
    features: [
      'Everything in Premium',
      'VIP room access',
      'Direct Q&A with creators',
      'Early access to content',
      '10% marketplace discount',
      '+50x Pulse Points bonus',
      'Elite badge',
    ],
    
    badge: {
      icon: '👑',
      displayName: 'Exclusive',
    },
    
    isActive: true,
  },
];

export const seedSubscriptionTiers = async () => {
  try {
    await connectToDatabase();
    
    logger.info('🌱 Seeding subscription tiers...');
    
    for (const tierData of defaultTiers) {
      const existingTier = await SubscriptionTier.findOne({ slug: tierData.slug });
      
      if (existingTier) {
        logger.info(`⏭️  Tier '${tierData.slug}' already exists, skipping...`);
        continue;
      }
      
      await SubscriptionTier.create(tierData);
      logger.info(`✓ Created tier: ${tierData.name} ($${tierData.price}/mo)`);
    }
    
    logger.info('✅ Subscription tiers seeded successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error seeding subscription tiers:', error);
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSubscriptionTiers();
}
