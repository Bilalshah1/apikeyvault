#include <stdio.h>
#include <string.h>
#include <stdlib.h>

char regContent[20] = "";  // Tracks what's inside R0

void translate_instruction(char* result, char* arg1, char* op, char* arg2) {

    printf("\n/* --- Generating Code for: %s = %s %s %s --- */\n", result, arg1, op, arg2);

    // Only load if not already in R0
    if (strcmp(regContent, arg1) != 0) {
        printf("LOAD R0, %s\n", arg1);
        strcpy(regContent, arg1);
    } else {
        printf("; Skipping LOAD (already in R0)\n");
    }

    // Perform operation
    if (strcmp(op, "+") == 0) {
        printf("ADD R0, %s\n", arg2);
    }
    else if (strcmp(op, "-") == 0) {
        printf("SUB R0, %s\n", arg2);
    }
    else if (strcmp(op, "*") == 0) {
        printf("MUL R0, %s\n", arg2);
    }
    else if (strcmp(op, "/") == 0) {
        printf("DIV R0, %s\n", arg2);
    }
    else if (strcmp(op, "=") == 0) {
        // No operation needed
    }

    printf("STORE %s, R0\n", result);

    // Update register content
    strcpy(regContent, result);
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