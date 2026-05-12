#include <stdio.h>
#include <string.h>
#include <stdlib.h>
/**
* Function: translate_instruction
* ----------------------------
* This function handles the "Instruction Selection" logic.
* It maps TAC symbols (+, -, *, /) to Assembly Mnemonics (ADD, SUB, MUL,
DIV).
*/
void translate_instruction(char *result, char *arg1, char *op, char *arg2)
{
    // We use a single register R0 for this basic demonstration.
    // In a real compiler, a 'Register Descriptor' would track available registers.

    printf("\n/* --- Generating Code for: %s = %s %s %s --- */\n", result, arg1,
           op, arg2);

    // STEP 1: LOAD
    // Bring the first operand from memory into the CPU register
    printf("LOAD R0, %s\n", arg1);

    // STEP 2: OPERATE
    // Select the assembly instruction based on the TAC operator
    if (strcmp(op, "+") == 0)
    {
        printf("ADD R0, %s\n", arg2); // Result in R0 = R0 + arg2
    }
    else if (strcmp(op, "-") == 0)
    {
        printf("SUB R0, %s\n", arg2); // Result in R0 = R0 - arg2
    }
    else if (strcmp(op, "*") == 0)
    {
        printf("MUL R0, %s\n", arg2); // Result in R0 = R0 * arg2
    }
    else if (strcmp(op, "/") == 0)
    {
        printf("DIV R0, %s\n", arg2); // Result in R0 = R0 / arg2
    }
    else if (strcmp(op, "=") == 0)
    {
        // Direct assignment: No math operation needed.
        // R0 already contains the value of arg1.
    }
    // STEP 3: STORE
    // Move the calculated value from the register back to the result variable in memory
    printf("STORE %s, R0\n", result);
}
int main()
{
    char result[20], arg1[20], op[10], arg2[20];

    // Open the intermediate code file
    FILE *file = fopen("input.txt", "r");
    if (file == NULL)
    {
        printf("Error: input.txt not found. Please create the file first.\n");
        return 1;
    }
    printf("; #########################################\n");
    printf("; # AUTOMATED TARGET CODE GENERATOR #\n");
    printf("; #########################################\n");
    /* Logic: Read four strings per line until End Of File (EOF).
    Format: result operand1 operator operand2
    */
    while (fscanf(file, "%s %s %s %s", result, arg1, op, arg2) != EOF)
    {
        translate_instruction(result, arg1, op, arg2);
    }
    fclose(file);
    printf("\n; Code generation complete.\n");
    return 0;
}