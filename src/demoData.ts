/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Lead } from "./types";

export const demoLeads: Omit<Lead, "id" | "createdAt">[] = [
  {
    companyName: "City View Lodge",
    category: "Lodge & Accommodation",
    location: "Harare, Zimbabwe",
    phone: "+263 242 701445",
    email: "reservations@cityviewlodge.co.zw",
    website: "", // No website -> will score high (+30)
    source: "Zimbabwe Tourism Authority Directory",
    status: "NEW",
    notes: "A centrally located guest lodge in Harare. Relies entirely on phone calls and walk-ins. Great opportunity for a complete digital package.",
  },
  {
    companyName: "Victoria Falls Adventure Lodge",
    category: "Adventure & Lodging",
    location: "Victoria Falls, Zimbabwe",
    phone: "+263 83 2844571",
    email: "info@vicfallsadvlodge.com",
    website: "https://vicfallsadvlodge-example.com", // Weak website, no booking system (+25), no WhatsApp (+15)
    source: "Web Search",
    status: "NEW",
    notes: "Has a basic static website built in 2015 but no direct booking engine or WhatsApp chat. Bookings must be made via a long contact form.",
  },
  {
    companyName: "Troutbeck Highlands Resort",
    category: "Resort & Hotel",
    location: "Nyanga, Zimbabwe",
    phone: "+263 29 2881243",
    email: "troutbeck@resorts-example.co.zw",
    website: "https://troutbeckhighlands-example.co.zw", // Simple site, weak mobile (+15)
    source: "ZTA Registered Operators",
    status: "NEW",
    notes: "Beautiful mountain resort. The website is slow, is not mobile friendly, and lacks direct check-out capabilities.",
  },
  {
    companyName: "Great Zimbabwe Historic Hotel",
    category: "Hotel",
    location: "Masvingo, Zimbabwe",
    phone: "+263 39 262223",
    email: "frontdesk@greatzimhotel.co.zw",
    website: "", // No website (+30)
    source: "Industry Directory",
    status: "NEW",
    notes: "Historic hotel near the Great Zimbabwe monument. Fully booked on weekends but struggles with mid-week direct distribution.",
  },
  {
    companyName: "Kariba Houseboats Agency",
    category: "Boat Charter & Safari",
    location: "Kariba, Zimbabwe",
    phone: "+263 772 400500",
    email: "bookings@karibaboats-example.com",
    website: "https://karibaboats-example.com", // Has website, but poor mobile and conversion path (+15)
    source: "ZTA Directory",
    status: "NEW",
    notes: "High-value charter service. Website does not load on mobile and has no instant chat feature to answer booking questions.",
  }
];
