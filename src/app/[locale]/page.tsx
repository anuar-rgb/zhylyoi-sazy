import Hero from "@/components/Hero";
import EventsSection from "@/components/EventsSection";
import ClubsSection from "@/components/ClubsSection";
import NewsSection from "@/components/NewsSection";
import GalleryPreviewSection from "@/components/GalleryPreviewSection";
import AchievementsSection from "@/components/AchievementsSection";
import ContactsMapSection from "@/components/ContactsMapSection";
import FoundersSection from "@/components/FoundersSection";
import { siteHasSection } from "@/lib/organization";

export default async function HomePage() {
  // The photo and video block shows «Кең Жылыой»'s own photos: an optional block (Настройки → «Разделы сайта»).
  const showGallery = await siteHasSection("gallery");
  return (
    <>
      {/* Hero */}
      <Hero />

      {/* Афиша */}
      <EventsSection />

      {/* Творческие кружки */}
      <ClubsSection />

      {/* Жаңалықтар */}
      <NewsSection />

      {/* Бейне және фотогалерея */}
      {showGallery && <GalleryPreviewSection />}

      {/* О нас / Достижения */}
      <AchievementsSection />

      {/* Контакты и карта */}
      <ContactsMapSection />

      {/* Құрылтайшы */}
      <FoundersSection />
    </>
  );
}
