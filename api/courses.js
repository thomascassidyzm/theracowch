/**
 * Course Manifest API - GitHub-First Workflow
 *
 * Automatically discovers courses from public/vfs/courses/ directory
 * and returns manifest with phase information
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';

export default async function handler(req, res) {
  // Set CORS headers for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const coursesPath = join(process.cwd(), 'public', 'vfs', 'courses');

    // Read all directories in courses/
    const entries = await readdir(coursesPath, { withFileTypes: true });
    const courseDirs = entries.filter(entry => entry.isDirectory());

    const courses = [];

    for (const dir of courseDirs) {
      const courseId = dir.name;
      const coursePath = join(coursesPath, courseId);

      // Check which phase files exist
      const phaseFiles = {
        seed_pairs: join(coursePath, 'seed_pairs.json'),
        lego_pairs: join(coursePath, 'lego_pairs.json'),
        baskets_deduplicated: join(coursePath, 'baskets_deduplicated.json'),
        course: join(coursePath, 'course.json')
      };

      let currentPhase = 0;
      let courseName = courseId;
      let description = '';
      let fileCount = 0;

      // Check seed_pairs.json (Phase 1)
      try {
        const seedData = await readFile(phaseFiles.seed_pairs, 'utf-8');
        const seedJson = JSON.parse(seedData);
        courseName = seedJson.courseName || courseId;
        description = seedJson.description || '';
        currentPhase = 1;
        fileCount = seedJson.seedPairs?.length || 0;
      } catch (e) {
        // File doesn't exist or is invalid
      }

      // Check lego_pairs.json (Phase 3)
      try {
        await stat(phaseFiles.lego_pairs);
        const legoData = await readFile(phaseFiles.lego_pairs, 'utf-8');
        const legoJson = JSON.parse(legoData);
        currentPhase = 3;
        fileCount += legoJson.legoPairs?.length || 0;
      } catch (e) {
        // File doesn't exist
      }

      // Check baskets_deduplicated.json (Phase 4)
      try {
        await stat(phaseFiles.baskets_deduplicated);
        const basketsData = await readFile(phaseFiles.baskets_deduplicated, 'utf-8');
        const basketsJson = JSON.parse(basketsData);
        currentPhase = 4;
        fileCount += basketsJson.baskets?.length || 0;
      } catch (e) {
        // File doesn't exist
      }

      // Check course.json (Phase 7+)
      try {
        await stat(phaseFiles.course);
        const courseData = await readFile(phaseFiles.course, 'utf-8');
        const courseJson = JSON.parse(courseData);
        currentPhase = 7;
        courseName = courseJson.courseName || courseName;
        description = courseJson.description || description;
      } catch (e) {
        // File doesn't exist
      }

      // Determine phase icon
      const phaseIcons = {
        0: '📂',
        1: '🌱',
        3: '🧱',
        4: '✅',
        7: '🚀'
      };

      const phaseNames = {
        0: 'Empty',
        1: 'Phase 1 - Seeds',
        3: 'Phase 3 - LEGOs',
        4: 'Phase 4 - Baskets',
        7: 'Phase 7+ - Production'
      };

      courses.push({
        code: courseId,
        name: courseName,
        description: description,
        phase: currentPhase,
        phaseIcon: phaseIcons[currentPhase],
        phaseName: phaseNames[currentPhase],
        itemCount: fileCount,
        path: `/vfs/courses/${courseId}`
      });
    }

    // Sort by name
    courses.sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({
      success: true,
      source: 'GitHub (public/vfs/courses/)',
      courseCount: courses.length,
      courses: courses,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error reading courses:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to read courses',
      message: error.message,
      courses: []
    });
  }
}
