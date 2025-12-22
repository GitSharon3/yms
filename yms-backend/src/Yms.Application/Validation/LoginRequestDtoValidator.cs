using FluentValidation;
using Yms.Core.Dtos.Auth;

namespace Yms.Application.Validation;

public sealed class LoginRequestDtoValidator : AbstractValidator<LoginRequestDto>
{
    public LoginRequestDtoValidator()
    {
        RuleFor(x => x.Identifier)
            .NotEmpty()
            .WithMessage("Email or username is required.")
            .MaximumLength(254)
            .WithMessage("Email or username cannot exceed 254 characters.")
            .When(x => !string.IsNullOrWhiteSpace(x.Identifier))
            .EmailAddress()
            .WithMessage("Please enter a valid email address.")
            .When(x => x.Identifier.Contains('@'));

        RuleFor(x => x.Password)
            .NotEmpty()
            .WithMessage("Password is required.")
            .MaximumLength(200)
            .WithMessage("Password cannot exceed 200 characters.")
            .MinimumLength(6)
            .WithMessage("Password must be at least 6 characters long.")
            .When(x => !string.IsNullOrWhiteSpace(x.Password));
    }
}
