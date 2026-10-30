import type { DatabaseClient } from '../src/database/client.js';
import type { ProfileData } from '../data/profile.js';

export async function seedProfile(client: DatabaseClient, data: ProfileData) {
  await client.$transaction(async tx => {
    const { id: profileId } = await tx.profile.upsert({
      where: { slug: data.slug },
      create: { slug: data.slug, name: data.name, description: data.description },
      update: { name: data.name, description: data.description },
    });

    for (const [sortOrder, link] of data.links.entries()) {
      await tx.profileLink.upsert({
        where: { profileId_name: { profileId, name: link.name } },
        create: { profileId, ...link, sortOrder },
        update: { ...link, sortOrder },
      });
    }
    for (const [sortOrder, name] of data.skills.entries()) {
      await tx.skill.upsert({
        where: { profileId_name: { profileId, name } },
        create: { profileId, name, sortOrder },
        update: { sortOrder },
      });
    }
    for (const [sortOrder, item] of data.experience.entries()) {
      await tx.experience.upsert({
        where: { profileId_key: { profileId, key: item.key } },
        create: { profileId, ...item, sortOrder },
        update: { ...item, sortOrder },
      });
    }
    for (const [sortOrder, item] of data.projects.entries()) {
      await tx.project.upsert({
        where: { profileId_key: { profileId, key: item.key } },
        create: { profileId, ...item, sortOrder },
        update: { ...item, sortOrder },
      });
    }

    // Файл с данными — источник истины для этой визитки; другие профили не затрагиваются.
    await tx.profileLink.deleteMany({
      where: { profileId, name: { notIn: data.links.map(link => link.name) } },
    });
    await tx.skill.deleteMany({
      where: { profileId, name: { notIn: data.skills } },
    });
    await tx.experience.deleteMany({
      where: { profileId, key: { notIn: data.experience.map(item => item.key) } },
    });
    await tx.project.deleteMany({
      where: { profileId, key: { notIn: data.projects.map(item => item.key) } },
    });
  }, { timeout: 10000 });
}
