export interface Buyer {
  id: string;
  buyerName: string;
  crop: string;
  quantity: string;
  price: string;
  location: string;
  rating: number;
  pickupLocation?: string;
  expectedPickupDate?: string;
  message?: string;
}

export interface ChatMessage {
  sender: "buyer" | "farmer";
  text: string;
}

export const buyers: Buyer[] = [
  {
    id: "1",
    buyerName: "FreshMart Traders",
    crop: "Tomato",
    quantity: "500 kg",
    price: "₹19/kg",
    location: "5 km away",
    rating: 4.5,
    pickupLocation: "Vashi Market Yard",
    expectedPickupDate: "Tomorrow",
    message: "We are looking for fresh tomatoes in bulk. Premium quality required.",
  },
  {
    id: "2",
    buyerName: "GreenLeaf Wholesale",
    crop: "Onion",
    quantity: "800 kg",
    price: "₹14/kg",
    location: "8 km away",
    rating: 4.2,
    pickupLocation: "Dadar Wholesale Market",
    expectedPickupDate: "Day after tomorrow",
    message: "Premium white onions needed for our supply chain.",
  },
  {
    id: "3",
    buyerName: "AgroDirect Market",
    crop: "Potato",
    quantity: "1200 kg",
    price: "₹11/kg",
    location: "3 km away",
    rating: 4.7,
    pickupLocation: "Central Wholesale Hub",
    expectedPickupDate: "Today",
    message: "Bulk potato orders for regional distribution.",
  },
  {
    id: "4",
    buyerName: "NutriVend Cooperatives",
    crop: "Carrot",
    quantity: "600 kg",
    price: "₹25/kg",
    location: "12 km away",
    rating: 4.3,
    pickupLocation: "Industrial Food Park",
    expectedPickupDate: "In 3 days",
    message: "Organic carrots preferred for processing facility.",
  },
  {
    id: "5",
    buyerName: "FarmToTable Exports",
    crop: "Capsicum",
    quantity: "400 kg",
    price: "₹35/kg",
    location: "7 km away",
    rating: 4.8,
    pickupLocation: "Export Warehouse",
    expectedPickupDate: "Tomorrow",
    message: "Red and yellow capsicums for international export quality.",
  },
  {
    id: "6",
    buyerName: "Local Market Traders",
    crop: "Cucumber",
    quantity: "300 kg",
    price: "₹8/kg",
    location: "2 km away",
    rating: 4.1,
    pickupLocation: "Local Market Stand",
    expectedPickupDate: "Today",
    message: "Regular supply of fresh cucumbers for retail market.",
  },
];

export const mockChatMessages: ChatMessage[] = [
  {
    sender: "buyer",
    text: "Hi, we need 500kg of fresh tomatoes this week.",
  },
  {
    sender: "farmer",
    text: "Great! I have premium quality tomatoes. Can we finalize at ₹20/kg?",
  },
  {
    sender: "buyer",
    text: "₹19/kg is our best offer. Our standard price for bulk orders.",
  },
  {
    sender: "farmer",
    text: "Fair enough. Let's confirm for 500kg at ₹19/kg.",
  },
  {
    sender: "buyer",
    text: "Perfect! Deal confirmed. Can you deliver by tomorrow at Vashi Market Yard?",
  },
  {
    sender: "farmer",
    text: "Yes, confirmed. See you tomorrow!",
  },
];
