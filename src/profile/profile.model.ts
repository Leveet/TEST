import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ProfileLink {
  @Field()
  name!: string;

  @Field()
  url!: string;
}

@ObjectType()
export class Skill {
  @Field()
  name!: string;
}

@ObjectType()
export class Experience {
  @Field()
  company!: string;

  @Field()
  position!: string;

  @Field()
  period!: string;

  @Field(() => [String])
  achievements!: string[];
}

@ObjectType()
export class Project {
  @Field()
  name!: string;

  @Field()
  description!: string;

  @Field(() => String, { nullable: true })
  url!: string | null;
}

@ObjectType()
export class Profile {
  @Field(() => ID)
  id!: number;

  @Field()
  name!: string;

  @Field()
  description!: string;

  @Field(() => [ProfileLink])
  links!: ProfileLink[];

  @Field(() => [Skill])
  skills!: Skill[];

  @Field(() => [Experience])
  experience!: Experience[];

  @Field(() => [Project])
  projects!: Project[];
}
