export interface Instruction {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInstructionInput {
  name: string;
  content: string;
}
