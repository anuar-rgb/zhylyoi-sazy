import HeroVideo from "@/components/HeroVideo";
import EventsSection from "@/components/EventsSection";
import ClubsSection from "@/components/ClubsSection";
import GalleryPreviewSection from "@/components/GalleryPreviewSection";
import AchievementsSection from "@/components/AchievementsSection";
import ContactsMapSection from "@/components/ContactsMapSection";

export default function HomePage() {
  return (
    <>
      {/* Hero video */}
      <HeroVideo />

      {/* Афиша */}
      <EventsSection />

      {/* Творческие кружки */}
      <ClubsSection />

      {/* Бейне және фотогалерея */}
      <GalleryPreviewSection />

      {/* О нас / Достижения */}
      <AchievementsSection />

      {/* Контакты и карта */}
      <ContactsMapSection />
    </>
  );
}
