/* ============================================================
   LANDSCAPERS INC. — CENTRAL CONTACT CONFIGURATION
   Every WhatsApp button, phone link and contact detail on the
   site reads from this one file. Change a value here and it
   updates everywhere (index.html and grow.html).

   !! OWNER TO VERIFY BEFORE DEPLOYMENT !!
   The previous site listed four different numbers in different
   places:
     +27 70 695 7670   (contact panel, floating WhatsApp button)
     +27 60 900 3768   (contact panel, second number)
     +27 70 695 7485   (structured data, quote form, pricing button)
     +27 69 131 5387   (grow.html)
   The first is used below as the provisional primary because it
   was the number shown to visitors. Confirm it — or replace it —
   before publishing. Use international format, digits only,
   no "+", spaces or leading zero (e.g. 27706957670).
   If you change it, also update "telephone" in the JSON-LD block
   at the top of index.html.
   ============================================================ */
window.LI_CONFIG = {
  whatsappNumber: '27706957670',          // digits only — used for every wa.me link
  phoneDisplay: '+27 70 695 7670',        // how the primary number is shown on the page
  secondaryPhoneDisplay: '+27 60 900 3768', // shown alongside it; set to '' to hide
  email: 'Sales@landscapersinc.co.za',
  defaultMessage: "Hi Landscapers Inc, I'd like to request a free site assessment and quotation."
};
