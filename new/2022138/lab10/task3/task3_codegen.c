#include <stdio.h>
#include <string.h>
#include <stdlib.h>

void translate_instruction(char* result, char* arg1, char* op, char* arg2) {

    if (strcmp(op, "=") == 0) {
    printf("\n/* --- Generating Code for: %s = %s --- */\n", result, arg1);
    } else {
        printf("\n/* --- Generating Code for: %s = %s %s %s --- */\n", result, arg1, op, arg2);
    }

    // Load both operands into separate registers
    printf("LOAD R0, %s\n", arg1);

    if (strcmp(op, "=") != 0) {
        printf("LOAD R1, %s\n", arg2);
    }

    // Perform operation using registers
    if (strcmp(op, "+") == 0) {
        printf("ADD R0, R1\n");
    }
    else if (strcmp(op, "-") == 0) {
        printf("SUB R0, R1\n");
    }
    else if (strcmp(op, "*") == 0) {
        printf("MUL R0, R1\n");
    }
    else if (strcmp(op, "/") == 0) {
        printf("DIV R0, R1\n");
    }
    else if (strcmp(op, "=") == 0) {
        // Only arg1 needed
        printf("; Assignment operation\n");
    }

    // Store result (always from R0)
    printf("STORE %s, R0\n", result);
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