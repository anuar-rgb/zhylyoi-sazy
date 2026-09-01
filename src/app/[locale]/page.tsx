import HeroVideo from "@/components/HeroVideo";
import EventsSection from "@/components/EventsSection";
import ClubsSection from "@/components/ClubsSection";
import NewsSection from "@/components/NewsSection";
import GalleryPreviewSection from "@/components/GalleryPreviewSection";
import AchievementsSection from "@/components/AchievementsSection";
import ContactsMapSection from "@/components/ContactsMapSection";
import FoundersSection from "@/components/FoundersSection";

export default function HomePage() {
  return (
    <>
      {/* Hero video */}
      <HeroVideo />

      {/* Афиша */}
      <EventsSection />

      {/* Творческие кружки */}
      <ClubsSection />

      {/* Жаңалықтар */}
      <NewsSection />

      {/* Бейне және фотогалерея */}
      <GalleryPreviewSection />

      {/* О нас / Достижения */}
      <AchievementsSection />

      {/* Контакты и карта */}
      <ContactsMapSection />

      {/* Құрылтайшы */}
      <FoundersSection />
    </>
  );
}
