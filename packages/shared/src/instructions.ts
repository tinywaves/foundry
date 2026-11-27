export interface Instruction {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateInstructionInput {
  name: string;
  content: string;
}
