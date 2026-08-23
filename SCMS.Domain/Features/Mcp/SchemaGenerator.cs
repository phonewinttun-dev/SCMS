using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using SCMS.Domain.Features.Mcp.Models;

namespace SCMS.Domain.Features.Mcp
{
    public static class SchemaGenerator
    {
        public static JsonSchemaInput FromClass<T>()
        {
            return FromType(typeof(T));
        }

        public static JsonSchemaInput FromType(Type type)
        {
            var schema = new JsonSchemaInput
            {
                Type = "object",
                Properties = new Dictionary<string, PropertyDefinition>(),
                Required = new List<string>()
            };

            foreach (var prop in type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
            {
                var propName = JsonNamingPolicy.CamelCase.ConvertName(prop.Name);

                var descAttr = prop.GetCustomAttribute<DescriptionAttribute>();
                var desc = descAttr?.Description ?? string.Empty;

                var jsonType = MapToJsonType(prop.PropertyType);

                var propDef = new PropertyDefinition
                {
                    Type = jsonType,
                    Description = desc
                };

                // System.ComponentModel.DataAnnotations.AllowedValues doubles as the JSON Schema enum,
                // so the accepted values are declared once and both validate and describe the property.
                var allowedAttr = prop.GetCustomAttribute<AllowedValuesAttribute>();
                if (allowedAttr?.Values is { Length: > 0 })
                {
                    propDef.Enum = allowedAttr.Values
                        .Where(v => v != null)
                        .Select(v => v!.ToString()!)
                        .ToList();
                }

                if (jsonType == "array")
                {
                    Type? itemType = null;
                    if (prop.PropertyType.IsArray)
                    {
                        itemType = prop.PropertyType.GetElementType();
                    }
                    else if (prop.PropertyType.IsGenericType)
                    {
                        itemType = prop.PropertyType.GetGenericArguments().FirstOrDefault();
                    }

                    if (itemType != null)
                    {
                        propDef.Items = FromType(itemType);
                    }
                }

                schema.Properties[propName] = propDef;

                var reqAttr = prop.GetCustomAttribute<RequiredAttribute>();
                if (reqAttr != null)
                {
                    schema.Required.Add(propName);
                }
            }

            return schema;
        }

        public static string MapToJsonType(Type type)
        {
            var underlyingType = Nullable.GetUnderlyingType(type) ?? type;

            if (underlyingType == typeof(string))
                return "string";
            if (underlyingType == typeof(int) || underlyingType == typeof(long) || underlyingType == typeof(short) || underlyingType == typeof(byte))
                return "integer";
            if (underlyingType == typeof(double) || underlyingType == typeof(float) || underlyingType == typeof(decimal))
                return "number";
            if (underlyingType == typeof(bool))
                return "boolean";
            if (underlyingType.IsArray || (underlyingType.IsGenericType && typeof(System.Collections.IEnumerable).IsAssignableFrom(underlyingType)))
                return "array";

            return "object";
        }
    }
}
