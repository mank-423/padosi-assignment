import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const catalogue = [
  {
    category: 'Home & Repairs',
    tasks: [
      { name: 'Plumber visit', description: 'Fix leaking taps, pipes, or install new fittings.' },
      { name: 'Electrician visit', description: 'Wiring, fan, light, or switchboard repairs.' },
      { name: 'Carpenter visit', description: 'Furniture repair, door alignment, and fittings.' },
      { name: 'AC service', description: 'Annual servicing, gas refill, and cleaning.' },
      { name: 'Deep home cleaning', description: 'Full-home deep clean with supplies included.' },
    ],
  },
  {
    category: 'Errands & Deliveries',
    tasks: [
      { name: 'Grocery run', description: 'Pick up a grocery list from a nearby store.' },
      { name: 'Courier pickup', description: 'Schedule a pickup for a return or shipment.' },
      { name: 'Pharmacy pickup', description: 'Collect prescription medicines and drop off.' },
      { name: 'Document delivery', description: 'Hand-deliver paperwork within the city.' },
      { name: 'Bill payments', description: 'Pay utilities and society dues in person.' },
    ],
  },
  {
    category: 'Personal & Lifestyle',
    tasks: [
      { name: 'Salon at home', description: 'Book a stylist for a home salon session.' },
      { name: 'Personal trainer', description: 'One-hour guided home fitness session.' },
      { name: 'Yoga instructor', description: 'Home yoga session for individuals or families.' },
      { name: 'Massage therapy', description: 'Certified therapist at home.' },
      { name: 'Event planning help', description: 'On-ground support for small gatherings.' },
    ],
  },
  {
    category: 'Business Support',
    tasks: [
      { name: 'GST filing assistance', description: 'Coordinate with a CA for monthly filing.' },
      { name: 'Courier account setup', description: 'Set up a business courier account.' },
      { name: 'Office supplies restock', description: 'Order and deliver office essentials.' },
      { name: 'Vendor coordination', description: 'Follow up with suppliers on your behalf.' },
      { name: 'Basic bookkeeping', description: 'Monthly expense tracking and reconciliation.' },
    ],
  },
];

async function main() {
  for (const group of catalogue) {
    const category = await prisma.category.upsert({
      where: { name: group.category },
      update: {},
      create: { name: group.category },
    });

    for (const task of group.tasks) {
      const existing = await prisma.task.findFirst({
        where: { name: task.name, categoryId: category.id },
      });
      if (!existing) {
        await prisma.task.create({
          data: { ...task, categoryId: category.id },
        });
      }
    }
  }
  console.log('Seed complete: 4 categories, 20 tasks.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());