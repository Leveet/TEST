import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { DatabaseModule } from './database/database.module.js';
import { ProfileModule } from './profile/profile.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [
    DatabaseModule,
    ProfileModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      introspection: true,
      graphiql: false,
      includeStacktraceInErrorResponses: false,
      allowBatchedHttpRequests: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault({ embed: true })],
    }),
  ],
  controllers: [HealthController],
})
export class AppModule {}
