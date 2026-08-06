export type Doctor = {
  id: string;
  nameFa: string;
  nameEn: string;
  specialtyFa: string;
  specialtyEn: string;
  departmentCode: string;
  image: string;
  rating: number;
};

export const POPULAR_DOCTORS: Doctor[] = [
  {
    id: "d1",
    nameFa: "دکتر محمد رضایی",
    nameEn: "Dr. Mohammad Rezaei",
    specialtyFa: "قلب و عروق",
    specialtyEn: "Cardiology",
    departmentCode: "CRD",
    image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80",
    rating: 4.9,
  },
  {
    id: "d2",
    nameFa: "دکتر سارا احمدی",
    nameEn: "Dr. Sara Ahmadi",
    specialtyFa: "زنان و زایمان",
    specialtyEn: "Obstetrics & Gynecology",
    departmentCode: "OBG",
    image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80",
    rating: 4.8,
  },
  {
    id: "d3",
    nameFa: "دکتر علی کریمی",
    nameEn: "Dr. Ali Karimi",
    specialtyFa: "جراحی عمومی",
    specialtyEn: "General Surgery",
    departmentCode: "SUR",
    image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80",
    rating: 4.7,
  },
  {
    id: "d4",
    nameFa: "دکتر مریم موسوی",
    nameEn: "Dr. Maryam Mousavi",
    specialtyFa: "اطفال",
    specialtyEn: "Pediatrics",
    departmentCode: "PED",
    image: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=400&q=80",
    rating: 4.9,
  },
];

export function doctorName(locale: string, d: Doctor) {
  return locale === "en" ? d.nameEn : d.nameFa;
}

export function doctorSpecialty(locale: string, d: Doctor) {
  return locale === "en" ? d.specialtyEn : d.specialtyFa;
}
