// Mahesh Electronics — authorized brand catalog
// Source: Brand Website.csv (verified authorizations)
// Structure: categories grouped from the CSV, brand chips link to OEM sites,
// scraper output (data/products.json) gets merged in if present.

window.ME_CATALOG = {
  categories: [
    {
      slug: "projectors",
      name: "Multimedia Projectors",
      icon: "📽",
      desc: "Classroom, conference and home cinema projectors. Smart Class GeM-eligible.",
      brands: [
        { name: "Epson",     url: "https://www.epson.com/",     logo: "EPSON" },
        { name: "ViewSonic", url: "https://www.viewsonic.com/", logo: "ViewSonic" },
        { name: "BenQ",      url: "https://www.benq.com/",      logo: "BenQ" }
      ]
    },
    {
      slug: "mfp",
      name: "Multifunction Machines",
      icon: "🖨",
      desc: "Print + scan + copy + fax. Office and SOHO-grade.",
      brands: [
        { name: "Epson",  url: "https://www.epson.com/",  logo: "EPSON" },
        { name: "Canon",  url: "https://global.canon/",   logo: "Canon" },
        { name: "HP",     url: "https://www.hp.com/",     logo: "HP" }
      ]
    },
    {
      slug: "printers",
      name: "Computer Printers",
      icon: "🖨",
      desc: "Inkjet, ink-tank, laser. Single-function.",
      brands: [
        { name: "Epson",  url: "https://www.epson.com/",  logo: "EPSON" },
        { name: "Canon",  url: "https://global.canon/",   logo: "Canon" },
        { name: "HP",     url: "https://www.hp.com/",     logo: "HP" }
      ]
    },
    {
      slug: "a3-xerox",
      name: "A3 Size Xerox / Copiers",
      icon: "📄",
      desc: "Heavy-duty A3 copiers and MFPs for offices and print shops.",
      brands: [
        { name: "Epson",  url: "https://www.epson.com/",  logo: "EPSON" },
        { name: "Canon",  url: "https://global.canon/",   logo: "Canon" },
        { name: "HP",     url: "https://www.hp.com/",     logo: "HP" }
      ]
    },
    {
      slug: "scanners",
      name: "Scanners",
      icon: "🖼",
      desc: "Flatbed, document and high-volume scanners.",
      brands: [
        { name: "Epson",  url: "https://www.epson.com/",  logo: "EPSON" },
        { name: "Canon",  url: "https://global.canon/",   logo: "Canon" },
        { name: "HP",     url: "https://www.hp.com/",     logo: "HP" }
      ]
    },
    {
      slug: "barcode",
      name: "Barcode Printers",
      icon: "🏷",
      desc: "Thermal and direct-thermal barcode label printers.",
      brands: [
        { name: "Epson",  url: "https://www.epson.com/",  logo: "EPSON" }
      ]
    },
    {
      slug: "desktops",
      name: "Desktops",
      icon: "🖥",
      desc: "Business and home desktops, tower form factor.",
      brands: [
        { name: "HP",   url: "https://www.hp.com/",   logo: "HP" },
        { name: "Acer", url: "https://www.acer.com/", logo: "Acer" }
      ]
    },
    {
      slug: "workstations",
      name: "Workstations",
      icon: "🛠",
      desc: "ISV-certified workstations for CAD, DCC, simulation.",
      brands: [
        { name: "HP",   url: "https://www.hp.com/",   logo: "HP" },
        { name: "Acer", url: "https://www.acer.com/", logo: "Acer" }
      ]
    },
    {
      slug: "all-in-one",
      name: "All-in-One PCs",
      icon: "🖼",
      desc: "Compact AIO desktops — perfect for reception, billing and home.",
      brands: [
        { name: "HP",   url: "https://www.hp.com/",   logo: "HP" },
        { name: "Acer", url: "https://www.acer.com/", logo: "Acer" }
      ]
    },
    {
      slug: "computer-workstations",
      name: "Computer Workstations",
      icon: "💻",
      desc: "Heavy-duty desktop workstations — Xeon, ECC RAM, pro GPUs.",
      brands: [
        { name: "HP",   url: "https://www.hp.com/",   logo: "HP" },
        { name: "Acer", url: "https://www.acer.com/", logo: "Acer" }
      ]
    },
    {
      slug: "laptop-workstations",
      name: "Laptop Workstations",
      icon: "💼",
      desc: "Mobile workstations for engineering, design, and field work.",
      brands: [
        { name: "HP",   url: "https://www.hp.com/",   logo: "HP" },
        { name: "Acer", url: "https://www.acer.com/", logo: "Acer" }
      ]
    },
    {
      slug: "laptops",
      name: "Laptops",
      icon: "💻",
      desc: "Student, business, gaming. Full warranty + service.",
      brands: [
        { name: "HP",   url: "https://www.hp.com/",   logo: "HP" },
        { name: "Acer", url: "https://www.acer.com/", logo: "Acer" }
      ]
    },
    {
      slug: "ups-line",
      name: "Line-Interactive UPS",
      icon: "🔋",
      desc: "Standby UPS for desktops, billing systems and home use.",
      brands: [
        { name: "Vertiv", url: "https://www.vertiv.com/", logo: "Vertiv" },
        { name: "Artis",  url: "https://www.artis.in/",   logo: "Artis"  },
        { name: "Elnova", url: "https://www.elnova.in/",  logo: "Elnova" }
      ]
    },
    {
      slug: "ups-online",
      name: "Online UPS",
      icon: "⚡",
      desc: "True-online UPS for servers, racks, medical, industrial.",
      brands: [
        { name: "Vertiv", url: "https://www.vertiv.com/", logo: "Vertiv" },
        { name: "Artis",  url: "https://www.artis.in/",   logo: "Artis"  },
        { name: "Elnova", url: "https://www.elnova.in/",  logo: "Elnova" }
      ]
    },
    {
      slug: "ac",
      name: "Air Conditioners",
      icon: "❄️",
      desc: "Split and inverter ACs for home, office and server rooms.",
      brands: [
        { name: "Acer", url: "https://www.acer.com/", logo: "Acer" },
        { name: "LG",   url: "https://www.lg.com/",   logo: "LG" }
      ]
    },
    {
      slug: "tv",
      name: "Televisions",
      icon: "📺",
      desc: "LED, QLED, OLED, smart TVs across sizes.",
      brands: [
        { name: "Acer", url: "https://www.acer.com/", logo: "Acer" },
        { name: "LG",   url: "https://www.lg.com/",   logo: "LG" }
      ]
    },
    {
      slug: "refrigerator",
      name: "Refrigerators",
      icon: "🧊",
      desc: "Single-door, double-door, side-by-side and convertible.",
      brands: [
        { name: "LG", url: "https://www.lg.com/", logo: "LG" }
      ]
    },
    {
      slug: "washing-machine",
      name: "Washing Machines",
      icon: "🧺",
      desc: "Top-load, front-load, semi-automatic.",
      brands: [
        { name: "LG", url: "https://www.lg.com/", logo: "LG" }
      ]
    },
    {
      slug: "cartridges",
      name: "OEM / Compatible Cartridges",
      icon: "🧴",
      desc: "Genuine OEM ink and toner. Compatible alternatives available.",
      brands: [
        { name: "Epson",   url: "https://www.epson.com/",   logo: "EPSON" },
        { name: "Canon",   url: "https://global.canon/",    logo: "Canon" },
        { name: "Lapcare", url: "https://www.lapcare.com/", logo: "Lapcare" }
      ]
    },
    {
      slug: "antivirus",
      name: "Antivirus & Endpoint Protection",
      icon: "🛡",
      desc: "Licensed antivirus and EDR for home, SMB, and enterprise.",
      brands: [
        { name: "Quick Heal", url: "https://www.quickheal.com/",          logo: "QH" },
        { name: "Seqrite",    url: "https://www.seqrite.com/",            logo: "Seqrite" },
        { name: "Vibranium",  url: "https://www.quickheal.com/vibranium", logo: "Vibranium" }
      ]
    },
    {
      slug: "monitors",
      name: "Computer Monitors",
      icon: "🖥",
      desc: "Office, gaming, and pro reference monitors. 24-inch to 32-inch.",
      brands: [
        { name: "Acer",    url: "https://www.acer.com/",    logo: "Acer" },
        { name: "HP",      url: "https://www.hp.com/",      logo: "HP" },
        { name: "Lapcare", url: "https://www.lapcare.com/", logo: "Lapcare" }
      ]
    },
    {
      slug: "keyboard-mouse",
      name: "Keyboard & Mouse",
      icon: "⌨️",
      desc: "Wired and wireless. Bulk packs available.",
      brands: [
        { name: "HP",      url: "https://www.hp.com/",      logo: "HP" },
        { name: "Dell",    url: "https://www.dell.com/",    logo: "Dell" },
        { name: "Lapcare", url: "https://www.lapcare.com/", logo: "Lapcare" }
      ]
    },
    {
      slug: "servers",
      name: "Servers",
      icon: "🗄",
      desc: "Tower and rack servers — file, web, ERP, database.",
      brands: [
        { name: "Acer", url: "https://www.acer.com/", logo: "Acer" },
        { name: "HP",   url: "https://www.hp.com/",   logo: "HP" }
      ]
    },
    {
      slug: "interactive-panel",
      name: "Interactive Panels",
      icon: "🪟",
      desc: "Smart Class and boardroom interactive flat panels.",
      brands: [
        { name: "Epson",     url: "https://www.epson.com/",                logo: "EPSON" },
        { name: "ViewSonic", url: "https://www.viewsonic.com/",            logo: "ViewSonic" },
        { name: "Title",     url: "https://www.title-interactive.com/",    logo: "Title" },
        { name: "Delta",     url: "https://www.deltaww.com/",              logo: "Delta" }
      ]
    }
  ]
};
