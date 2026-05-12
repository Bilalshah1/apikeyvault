#include <stdio.h>
#include <string.h>
#include <stdlib.h>

int labelCount = 0;

void translate_instruction(char* result, char* arg1, char* op, char* arg2) {
    
    if (strcmp(op, "=") == 0)
        printf("\n/* --- Generating Code for: %s = %s --- */\n", result, arg1);
    else
        printf("\n/* --- Generating Code for: %s = %s %s %s --- */\n", result, arg1, op, arg2);
    // LOAD first operand
    printf("LOAD R0, %s\n", arg1);

    // Arithmetic operations
    if (strcmp(op, "+") == 0) {
        printf("ADD R0, %s\n", arg2);
        printf("STORE %s, R0\n", result);
    }
    else if (strcmp(op, "-") == 0) {
        printf("SUB R0, %s\n", arg2);
        printf("STORE %s, R0\n", result);
    }
    else if (strcmp(op, "*") == 0) {
        printf("MUL R0, %s\n", arg2);
        printf("STORE %s, R0\n", result);
    }
    else if (strcmp(op, "/") == 0) {
        printf("DIV R0, %s\n", arg2);
        printf("STORE %s, R0\n", result);
    }
    else if (strcmp(op, "=") == 0) {
        printf("STORE %s, R0\n", result);
    }

    // Relational operations
    else if (strcmp(op, "<") == 0 || strcmp(op, ">") == 0 || strcmp(op, "==") == 0) {
        int Ltrue = labelCount++;
        int Lend = labelCount++;

        printf("CMP R0, %s\n", arg2);

        if (strcmp(op, "<") == 0)
            printf("JL L%d\n", Ltrue);
        else if (strcmp(op, ">") == 0)
            printf("JG L%d\n", Ltrue);
        else if (strcmp(op, "==") == 0)
            printf("JE L%d\n", Ltrue);

        // False case
        printf("LOAD R0, 0\n");
        printf("JMP L%d\n", Lend);

        // True case
        printf("L%d:\n", Ltrue);
        printf("LOAD R0, 1\n");

        // End label
        printf("L%d:\n", Lend);
        printf("STORE %s, R0\n", result);
    }
}

int main() {
    char result[20], arg1[20], op[10], arg2[20];

    FILE *file = fopen("input.txt", "r");
    if (!file) {
        printf("Error opening input.txt\n");
        return 1;
    }

    while (fscanf(file, "%s %s %s %s", result, arg1, op, arg2) != EOF) {
        translate_instruction(result, arg1, op, arg2);
    }

    fclose(file);
    return 0;
}