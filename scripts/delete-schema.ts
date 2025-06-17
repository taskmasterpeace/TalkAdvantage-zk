import weaviate from 'weaviate-ts-client';

async function deleteSchema() {
  try {
    // Initialize Weaviate client
    const client = weaviate.client({
      scheme: process.env.WEAVIATE_SCHEME || 'http',
      host: process.env.WEAVIATE_HOST || 'localhost:8080',
    });

    console.log('Starting schema deletion...');

    // Get current schema
    const schema = await client.schema.getter().do();
    
    // Delete each class
    if (schema.classes) {
      for (const classObj of schema.classes) {
        const className = classObj.class as string;
        if (className) {
          console.log(`Deleting class: ${className}`);
          await client.schema
            .classDeleter()
            .withClassName(className)
            .do();
        }
      }
    }

    console.log('Schema deletion completed successfully!');
  } catch (error) {
    console.error('Error deleting schema:', error);
    process.exit(1);
  }
}

// Run the deletion
deleteSchema(); 