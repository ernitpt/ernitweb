// README: run with  node scripts/seedExperiences.js
// required:  npm install firebase-admin


// scripts/seedExperiences.js
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json'); // Place this in the same folder

// Initialize Firebase Admin
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const experiences = [
  // Adventure
  { id: 'adv1', partnerId:'dmvViyovUnby8vtxx105llFulU62', title: 'Surf Class', description: 'Surf Class', category: 'adventure', imageUrl: 'https://picsum.photos/seed/adv6/400/300', price: 70, createdAt: new Date() },
  { id: 'adv2', partnerId:'YPmHH5uVdgdukobTZFqNjpEFfKo1', title: 'Boat Tour', description: 'Beginner surf class', category: 'adventure', imageUrl: 'https://picsum.photos/seed/adv5/400/300', price: 70, createdAt: new Date() },
  { id: 'adv3', partnerId:'YPmHH5uVdgdukobTZFqNjpEFfKo1', title: 'Kayak Tour', description: 'River adventure tour', category: 'adventure', imageUrl: 'https://picsum.photos/seed/adv3/400/300', price: 70, createdAt: new Date() },
  { id: 'adv4', partnerId:'E3O5zKbxDZa5JN1eK3EUv2SGtW52', title: 'Outdoor Climbing', description: 'Trail riding experience', category: 'adventure', imageUrl: 'https://picsum.photos/seed/adv1/400/300', price: 80, createdAt: new Date() },
  { id: 'adv5', partnerId:'YPmHH5uVdgdukobTZFqNjpEFfKo1', title: 'Coasteering', description: 'Indoor climbing walls', category: 'adventure', imageUrl: 'https://picsum.photos/seed/adv2/400/300', price: 90, createdAt: new Date() },
  { id: 'adv6', partnerId:'YPmHH5uVdgdukobTZFqNjpEFfKo1', title: 'Dolphins Observation', description: 'Canopy zipline course', category: 'adventure', imageUrl: 'https://picsum.photos/seed/adv4/400/300', price: 100, createdAt: new Date() },
  { id: 'adv7', partnerId:'lshg0cMtfyPg0y3CmUwFjUjX5ws1', title: 'Skydive', description: 'Skydive', category: 'adventure', imageUrl: 'https://picsum.photos/seed/adv6/400/300', price: 139, createdAt: new Date() },
  { id: 'adv8', partnerId:'YPmHH5uVdgdukobTZFqNjpEFfKo1', title: 'Diving Baptism', description: 'Diving Baptism', category: 'adventure', imageUrl: 'https://picsum.photos/seed/adv6/400/300', price: 220, createdAt: new Date() },

  // Wellness 
  { id: 'wel1', partnerId:'E3O5zKbxDZa5JN1eK3EUv2SGtW52', title: 'Sound Healing', description: 'Mindfulness workshop', category: 'relaxation', imageUrl: 'https://picsum.photos/seed/rel2/400/300', price: 50, createdAt: new Date() },
  { id: 'wel2', partnerId:'ION490slREPpWJNNKvb5RRtuq033', title: 'Massagem Terapêutica Desportiva', description: 'Full day spa package', category: 'relaxation', imageUrl: 'https://picsum.photos/seed/rel1/400/300', price: 80, createdAt: new Date() },

  // Creative
  { id: 'cre1', partnerId:'j368pTfYsiUYfOS1oWxnioigg3g1', title: 'Workshops de Cerâmica', description: 'Wine tasting experience', category: 'creative', imageUrl: 'https://picsum.photos/seed/foo2/400/300', price: 30, createdAt: new Date() },
  { id: 'cre2', partnerId:'tpTn7qsRMwTKe9gr28GR5Br7UtG2', title: 'Brunch + Workshop de Cerâmica', description: 'Local food tour', category: 'creative', imageUrl: 'https://picsum.photos/seed/foo3/400/300', price: 70, createdAt: new Date() },
  { id: 'cre3', partnerId:'rwKPyJJTlaSfrZbyb3Hn46gUfDn1', title: 'Workshop de Pintura de Azulejo', description: 'Chef-led cooking lesson', category: 'creative', imageUrl: 'https://picsum.photos/seed/foo1/400/300', price: 80, createdAt: new Date() },

  // Entertainment
  // { id: 'ent1', title: 'Concert Tickets', description: 'Live music experience', category: 'entertainment', imageUrl: 'https://picsum.photos/seed/ent1/400/300', price: 0, createdAt: new Date() },
  // { id: 'ent2', title: 'Theater Show', description: 'Broadway performance', category: 'entertainment', imageUrl: 'https://picsum.photos/seed/ent2/400/300', price: 0, createdAt: new Date() },
  // { id: 'ent3', title: 'Comedy Club', description: 'Stand-up comedy night', category: 'entertainment', imageUrl: 'https://picsum.photos/seed/ent3/400/300', price: 0, createdAt: new Date() },
  // { id: 'ent4', title: 'Escape Room', description: 'Puzzle solving adventure', category: 'entertainment', imageUrl: 'https://picsum.photos/seed/ent4/400/300', price: 0, createdAt: new Date() },
  // { id: 'ent5', title: 'Movie Night', description: 'Premium cinema experience', category: 'entertainment', imageUrl: 'https://picsum.photos/seed/ent5/400/300', price: 0, createdAt: new Date() },
  // { id: 'ent6', title: 'Karaoke Party', description: 'Private karaoke room', category: 'entertainment', imageUrl: 'https://picsum.photos/seed/ent6/400/300', price: 0, createdAt: new Date() },
];

async function seedExperiences() {
  for (const exp of experiences) {
    await db.collection('experiences').doc(exp.id).set(exp);
    console.log(`Added experience: ${exp.title}`);
  }
  console.log('All experiences added successfully!');
}

seedExperiences().catch(console.error);
