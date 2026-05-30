import React from 'react';

const menuItems = [
  {
    id: 1,
    title: 'Classic Smashed',
    description: 'Double smashed beef with cheese, pickles, smash sauce.',
    price: '£8.49',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60',
    badge: { text: 'Must Try', type: 'must-try' }
  },
  {
    id: 2,
    title: 'Smoky Bacon Smash',
    description: 'Double smashed beef with cheese, bacon, jalapeños, smoky sauce.',
    price: '£9.49',
    image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500&auto=format&fit=crop&q=60',
    badge: { text: 'New', type: 'new' }
  },
  {
    id: 3,
    title: '3 Cheese Loaded Fries',
    description: 'Fries with 3 cheese sauce & crispy onions & crazy onions.',
    price: '£6.49',
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 4,
    title: 'Smash Bowl',
    description: 'Smashed beef, rice, smash sauce, pickles, onions.',
    price: '£8.49',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60'
  },
  {
    id: 5,
    title: 'Fresh Salad',
    description: 'Lettuce, tomatoes, onions, cucumbers, house dressing.',
    price: '£4.49',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=60'
  }
];

export default function MostLovedMenu() {
  const handleAddToCart = (id) => {
    console.log(`Item added to cart with ID: ${id}`);
  };

  return (
    <div className="bg-[#0c0c0c] text-white p-6 md:p-12 min-h-screen flex flex-col justify-center items-center">
      <div className="w-full max-w-7xl">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-extrabold uppercase tracking-wider text-zinc-100">
              Our Most Loved
            </h2>
            <span className="text-orange-500 text-lg">🔥</span>
          </div>
          <div className="flex gap-1">
            <span className="h-1 w-8 bg-orange-600 rounded"></span>
            <span className="h-1 w-3 bg-orange-600 rounded"></span>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {menuItems.map((item) => (
            <div 
              key={item.id} 
              className="bg-[#141414] border border-zinc-800/60 rounded-xl p-4 flex flex-col justify-between relative group hover:border-zinc-700 transition duration-200"
            >
              {/* Conditional Badges */}
              {item.badge && (
                <span className={`absolute top-3 left-3 text-[10px] font-bold uppercase px-2 py-0.5 rounded text-white tracking-wider z-10 ${
                  item.badge.type === 'must-try' ? 'bg-emerald-600' : 'bg-red-600'
                }`}>
                  {item.badge.text}
                </span>
              )}

              <div>
                <div className="overflow-hidden rounded-lg aspect-square mb-4 flex items-center justify-center bg-zinc-900">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="object-cover w-full h-full group-hover:scale-105 transition duration-300" 
                  />
                </div>
                <h3 className="font-bold text-base text-zinc-100 mb-1">{item.title}</h3>
                <p className="text-xs text-zinc-400 min-h-[3rem] line-clamp-3">
                  {item.description}
                </p>
              </div>

              {/* Price & Action Area */}
              <div className="mt-4">
                <div className="flex justify-end mb-3">
                  <span className="text-orange-500 font-bold text-base">{item.price}</span>
                </div>
                <button 
                  onClick={() => handleAddToCart(item.id)}
                  className="w-full border border-zinc-700 hover:border-orange-500 hover:bg-orange-500/10 text-orange-500 font-bold text-xs py-2.5 rounded-lg transition duration-200 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>&gt;</span> ADD
                </button>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}