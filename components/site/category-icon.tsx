import {
  Amphora,
  Asterisk,
  Drama,
  Mountain,
  Music,
  Palette,
  Trophy,
  Wine,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

// Keys are the slugs produced by slugifyCategory().
const categoryIcons: Record<string, LucideIcon> = {
  musica: Music,
  tradizione: Amphora,
  teatro: Drama,
  "arte-e-cultura": Palette,
  sport: Trophy,
  "food-e-wine": Wine,
  natura: Mountain,
  altro: Asterisk,
};

// Decorative: the category name is always rendered next to the icon.
export function CategoryIcon({ slug, ...props }: LucideProps & { slug: string }) {
  const Icon = categoryIcons[slug] ?? Asterisk;
  return <Icon aria-hidden="true" {...props} />;
}
