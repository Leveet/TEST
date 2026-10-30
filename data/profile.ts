export const profileData = {
  slug: 'main',
  name: 'Виталий',
  description:
    'Fullstack-разработчик и AI-дебаггер. Три года практики: разработка API, ' +
    'поиск и исправление ошибок, автоматизация тестирования.',
  links: [{ name: 'GitHub', url: 'https://github.com/Leveet' }],
  skills: ['Python', 'C# / .NET', 'JavaScript', 'SQL', 'Docker', 'Linux', 'REST API', 'AI debugging'],
  experience: [{
    key: 'independent',
    company: 'Фриланс',
    position: 'Fullstack-разработчик, AI-дебаггер',
    period: '3 года',
    achievements: [
      'Разработал собственное API.',
      'Написал Android-ферму для тестирования.',
    ],
  }],
  projects: [
    {
      key: 'api',
      name: 'Собственное API',
      description: 'Собственное API. Доступ по запросу.',
      url: null as string | null,
    },
    {
      key: 'android-farm',
      name: 'Android-ферма',
      description: 'Собственная Android-ферма для тестирования. Доступ по запросу.',
      url: null as string | null,
    },
  ],
};

export type ProfileData = typeof profileData;
