import dayjs from 'dayjs';

export const calculateAge = (birthDate) => {
  if (!birthDate) return null;
  return dayjs().diff(dayjs(birthDate), 'year');
}; 