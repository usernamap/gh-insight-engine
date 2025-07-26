#!/usr/bin/env node

/**
 * Script de nettoyage des datasets corrompus
 * 
 * Ce script identifie et supprime les datasets qui contiennent des ObjectIds
 * au lieu d'objets JSON complets dans le champ repositories.
 * 
 * Ces datasets corrompus proviennent de l'ancienne méthode DatasetModel.upsert()
 * qui était incompatible avec le schéma Prisma.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Vérifie si un dataset est corrompu
 */
function isDatasetCorrupted(dataset) {
  if (!dataset.repositories || dataset.repositories.length === 0) {
    return false;
  }

  // Vérifier les premiers repositories
  for (let i = 0; i < Math.min(5, dataset.repositories.length); i++) {
    const repoStr = dataset.repositories[i];
    
    try {
      const parsed = JSON.parse(repoStr);
      
      // Si c'est un objet vide ou n'a pas les propriétés essentielles
      if (!parsed || typeof parsed !== 'object' || !parsed.nameWithOwner) {
        return true;
      }
    } catch (error) {
      // Si le parsing échoue (probablement un ObjectId)
      return true;
    }
  }
  
  return false;
}

/**
 * Fonction principale
 */
async function cleanCorruptedDatasets() {
  try {
    console.log('🔍 Recherche des datasets corrompus...');
    
    // Récupérer tous les datasets
    const allDatasets = await prisma.dataset.findMany({
      select: {
        id: true,
        userProfileId: true,
        repositories: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log(`📊 ${allDatasets.length} datasets trouvés au total`);

    // Identifier les datasets corrompus
    const corruptedDatasets = allDatasets.filter(isDatasetCorrupted);
    
    console.log(`❌ ${corruptedDatasets.length} datasets corrompus identifiés`);
    
    if (corruptedDatasets.length === 0) {
      console.log('✅ Aucun dataset corrompu trouvé !');
      return;
    }

    // Afficher les détails des datasets corrompus
    console.log('\nDétails des datasets corrompus:');
    for (const dataset of corruptedDatasets) {
      console.log(`- Dataset ${dataset.id}: ${dataset.repositories.length} repositories, créé le ${dataset.createdAt.toISOString()}`);
    }

    // Demander confirmation (en mode interactif)
    if (process.argv.includes('--dry-run')) {
      console.log('\n🔍 Mode dry-run: aucune suppression effectuée');
      return;
    }

    if (!process.argv.includes('--force')) {
      console.log('\n⚠️  Pour supprimer ces datasets corrompus, relancez avec --force');
      console.log('💡 Pour voir les datasets sans les supprimer, utilisez --dry-run');
      return;
    }

    console.log('\n🗑️  Suppression des datasets corrompus...');
    
    // Supprimer les datasets corrompus
    const deleteResult = await prisma.dataset.deleteMany({
      where: {
        id: {
          in: corruptedDatasets.map(d => d.id),
        },
      },
    });

    console.log(`✅ ${deleteResult.count} datasets corrompus supprimés avec succès !`);
    
    // Statistiques finales
    const remainingDatasets = await prisma.dataset.count();
    console.log(`📊 ${remainingDatasets} datasets restants dans la base`);

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Afficher l'aide
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
🧹 Script de nettoyage des datasets corrompus

Usage:
  node scripts/clean-corrupted-datasets.js [options]

Options:
  --dry-run    Afficher les datasets corrompus sans les supprimer
  --force      Supprimer les datasets corrompus (requis pour la suppression)
  --help, -h   Afficher cette aide

Exemples:
  node scripts/clean-corrupted-datasets.js --dry-run
  node scripts/clean-corrupted-datasets.js --force
`);
  process.exit(0);
}

// Exécuter le script
cleanCorruptedDatasets(); 