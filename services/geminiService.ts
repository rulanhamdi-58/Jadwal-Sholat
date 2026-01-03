import { GoogleGenAI, Type } from "@google/genai";
// Import adhan as default to handle potential CJS interop issues with esm.sh
import adhan from 'adhan';
import { DailyData, GeoLocation, PrayerTime } from "../types";

// Destructure from the default export
// This handles cases where the library is wrapped as a CommonJS module by the CDN
const { Coordinates, CalculationMethod, PrayerTimes, Madhab } = adhan;

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to format Date to HH:mm string (24h)
const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// Helper for delay with exponential backoff
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to convert Arabic numerals to English for parsing integers
const convertArabicToEnglish = (str: string) => {
    return str.replace(/[١٢٣٤٥٦٧٨٩٠]/g, (d) => {
        return ({ '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9', '٠': '0' } as any)[d];
    });
};

// NEW: Helper to get consistent Hijri data using Intl (matches MonthlyCalendar logic exactly)
const getHijriDataLocally = (date: Date): { day: number, month: string, year: number, dayNameArabic: string, fullString: string } => {
    try {
        const fmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const parts = fmt.formatToParts(date);
        const dayVal = parts.find(p => p.type === 'day')?.value || "";
        const monthVal = parts.find(p => p.type === 'month')?.value || "";
        const yearVal = parts.find(p => p.type === 'year')?.value || "";

        const dayNameFmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { weekday: 'long' });
        const dayName = dayNameFmt.format(date);

        const dayNum = parseInt(convertArabicToEnglish(dayVal)) || 0;
        const yearNum = parseInt(convertArabicToEnglish(yearVal)) || 0;

        return {
            day: dayNum,
            month: monthVal,
            year: yearNum,
            dayNameArabic: dayName,
            fullString: `${dayVal} ${monthVal} ${yearVal}`
        };
    } catch (e) {
        console.error("Local Hijri calc failed", e);
        // Fail-safe return
        return { day: 0, month: "", year: 0, dayNameArabic: "", fullString: "" };
    }
};

export const fetchDailyIslamicData = async (location: GeoLocation, targetDate?: Date): Promise<DailyData> => {
  const modelId = "gemini-3-flash-preview";
  
  // Use targetDate if provided, otherwise use today
  const dateToUse = targetDate || new Date();
  
  // 1. CALCULATE PRECISE PRAYER TIMES (Astronomical Math)
  // We use the 'adhan' library for mathematical accuracy based on GPS.
  // Gemini is used later for text/cultural data.
  
  // Safety check to ensure library loaded
  if (!Coordinates || !CalculationMethod || !PrayerTimes) {
      console.error("Adhan library exports:", adhan);
      throw new Error("Adhan library failed to load properly. Exports missing.");
  }

  const coordinates = new Coordinates(location.lat, location.lng);
  
  // Use Singapore/MUIS method as a standard safe default for SE Asia/Indonesia
  // or MuslimWorldLeague for general accuracy.
  const params = CalculationMethod.Singapore(); 
  params.madhab = Madhab.Shafi; // Majority in Indonesia
  
  const prayerTimes = new PrayerTimes(coordinates, dateToUse, params);
  
  // Calculate Extra Times:
  // 1. Shuruq (Sunrise) is available directly.
  // 2. Duha (Ishraq) is typically ~20 minutes after Sunrise.
  // 3. Midnight = Maghrib + (Time between Maghrib and Fajr) / 2
  // 4. Last Third = Maghrib + (Time between Maghrib and Fajr) * 2/3
  
  const sunriseDate = prayerTimes.sunrise;
  const duhaDate = new Date(sunriseDate.getTime() + (20 * 60 * 1000)); // Add 20 minutes

  // Need tomorrow's Fajr for accurate night calculation relative to the target date
  const tomorrow = new Date(dateToUse);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const prayerTimesTomorrow = new PrayerTimes(coordinates, tomorrow, params);
  
  const maghribTime = prayerTimes.maghrib.getTime();
  const fajrTomorrowTime = prayerTimesTomorrow.fajr.getTime();
  const nightDuration = fajrTomorrowTime - maghribTime;
  
  const midnightDate = new Date(maghribTime + (nightDuration / 2));
  const lastThirdDate = new Date(maghribTime + (nightDuration * (2/3)));

  // Construct the PrayerTime array with calculated values
  // ORDER MATTERS: Chronological order helps the "Next Prayer" logic.
  const calculatedPrayers: PrayerTime[] = [
    { name: "Fajr", nameArabic: "الفجر", time: formatTime(prayerTimes.fajr) },
    { name: "Shuruq", nameArabic: "الشروق", time: formatTime(sunriseDate) },
    { name: "Duha", nameArabic: "الضحى", time: formatTime(duhaDate) },
    { name: "Dhuhr", nameArabic: "الظهر", time: formatTime(prayerTimes.dhuhr) },
    { name: "Asr", nameArabic: "العصر", time: formatTime(prayerTimes.asr) },
    { name: "Maghrib", nameArabic: "المغرب", time: formatTime(prayerTimes.maghrib) },
    { name: "Isha", nameArabic: "العشاء", time: formatTime(prayerTimes.isha) },
    { name: "Midnight", nameArabic: "نصف الليل", time: formatTime(midnightDate) },
    { name: "LastThird", nameArabic: "الثلث الأخير", time: formatTime(lastThirdDate) }
  ];

  // 2. PREPARE DATES & HIJRI DATA
  
  // Format Gregorian date in LATIN (Indonesian locale)
  const gregorianLatin = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(dateToUse);

  // --- SYNC HIJRI LOGIC (Changes at Maghrib) ---
  const now = new Date();
  const isToday = dateToUse.toDateString() === now.toDateString();
  const maghribDate = prayerTimes.maghrib;

  // Default: Hijri calculation based on the target Gregorian date
  let hijriCalcDate = dateToUse;

  // RULE: If we are looking at 'Today', and current time is past Maghrib,
  // the Hijri day has already advanced to the next day.
  if (isToday && now >= maghribDate) {
    const nextDay = new Date(dateToUse);
    nextDay.setDate(nextDay.getDate() + 1);
    hijriCalcDate = nextDay;
  }

  // FORCE LOCAL CALCULATION:
  // Instead of asking Gemini for the date (which might be inconsistent),
  // we calculate it here using the same method as MonthlyCalendar.
  const consistentHijriData = getHijriDataLocally(hijriCalcDate);

  // 3. FETCH CONTEXTUAL DATA FROM GEMINI (City, Quote)
  // We still use Gemini for the location name and the quote.
  const prompt = `
    You are an expert Islamic Assistant.
    
    Context:
    - Location: Lat ${location.lat}, Lng ${location.lng}
    
    Task:
    1. Provide the specific city/region name for these coordinates (e.g., "Jakarta Selatan, Indonesia").
    2. Provide a short, inspiring Islamic quote or Hadith (Arabic text + Indonesian translation).
    
    Return strictly structured JSON.
  `;

  let parsed: any;
  const MAX_RETRIES = 3;
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              city: { type: Type.STRING },
              quote: { type: Type.STRING }
            }
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from Gemini");
      
      parsed = JSON.parse(text);
      break; 
    } catch (error: any) {
      console.warn(`Gemini API attempt ${i + 1} failed:`, error);
      
      if (error?.message?.includes('429') || error?.status === 429 || error?.toString().includes('RESOURCE_EXHAUSTED')) {
         console.warn("Gemini Quota Exceeded. Switching to fallback mode.");
         break;
      }

      if (i < MAX_RETRIES - 1) {
        await delay(1000 * Math.pow(2, i));
      }
    }
  }

  // Fallback if API totally fails
  const fallbackCity = "Mode Hemat Data (Offline)";
  const fallbackQuote = "لا يكلف الله نفسا إلا وسعها\nAllah tidak membebani seseorang melainkan sesuai dengan kesanggupannya.";

  return {
    gregorianDate: gregorianLatin,
    prayers: calculatedPrayers, 
    // Use the locally calculated Hijri data to ensure consistency with the calendar view
    hijri: consistentHijriData, 
    city: parsed ? parsed.city : fallbackCity,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    quote: parsed ? parsed.quote : fallbackQuote
  };
};